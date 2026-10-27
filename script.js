import { getSessionToken } from './session.js';

// Mercado Livre now refuses unauthenticated searches, so products come through
// a small proxy (github.com/gabrielncorreia/mercado-livre-proxy) that holds the token.
// `npm run dev` uses the local proxy; `npm run build` uses the deployed one. VITE_PROXY_URL overrides both.
const DEPLOYED = 'https://mercado-livre-proxy.gnc-apps-7.workers.dev';
const API_URL = import.meta.env.VITE_PROXY_URL
  || (import.meta.env.PROD ? DEPLOYED : 'http://localhost:8799');
const CART_KEY = 'shopCart.v2';

// The proxy answers only requests with a session token; renew it once on 401.
async function authorizedFetch(path, retried = false) {
  const token = await getSessionToken(API_URL, retried);
  const response = await fetch(`${API_URL}${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (response.status === 401 && !retried) return authorizedFetch(path, true);
  return response;
}

const brl = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ---------- Cart state ----------

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(saved) ? saved.filter((item) => item && item.id && item.quantity > 0) : [];
  } catch {
    return [];
  }
}

let cart = readCart();

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function addToCart({ id, title, thumbnail, price }) {
  const line = cart.find((item) => item.id === id);
  if (line) line.quantity += 1;
  else cart.push({ id, title, thumbnail, price, quantity: 1 });
  saveCart();
  renderCart();
}

function changeQuantity(id, delta) {
  cart = cart
    .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
    .filter((item) => item.quantity > 0);
  saveCart();
  renderCart();
}

// ---------- Rendering (textContent only: product data never becomes HTML) ----------

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function createProductItemElement(product) {
  const card = element('article', 'item');
  const image = element('img', 'item__image');
  image.src = product.thumbnail;
  image.alt = '';
  image.loading = 'lazy';
  const button = element('button', 'item__add', 'Adicionar');
  button.type = 'button';
  button.setAttribute('aria-label', `Adicionar ${product.title} ao carrinho`);
  button.addEventListener('click', () => {
    addToCart(product);
    button.textContent = 'Adicionado';
    setTimeout(() => { button.textContent = 'Adicionar'; }, 1200);
  });
  card.append(image, element('h3', 'item__title', product.title), element('p', 'item__price', brl(product.price)), button);
  return card;
}

function createCartItemElement(item) {
  const li = element('li', 'cart__item');
  const info = element('div', 'cart__item-info');
  info.append(element('span', 'cart__item-name', item.title), element('span', 'cart__item-unit', `${item.quantity} × ${brl(item.price)}`));

  const controls = element('div', 'cart__item-controls');
  const minus = element('button', 'qty', '−');
  minus.type = 'button';
  minus.setAttribute('aria-label', `Remover uma unidade de ${item.title}`);
  minus.addEventListener('click', () => changeQuantity(item.id, -1));
  const plus = element('button', 'qty', '+');
  plus.type = 'button';
  plus.setAttribute('aria-label', `Adicionar uma unidade de ${item.title}`);
  plus.addEventListener('click', () => changeQuantity(item.id, 1));
  controls.append(minus, plus, element('span', 'cart__item-total', brl(item.price * item.quantity)));

  li.append(info, controls);
  return li;
}

function renderCart() {
  const list = document.querySelector('.cart__items');
  list.replaceChildren(...cart.map(createCartItemElement));
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = brl(cart.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const label = `${count} ${count === 1 ? 'item' : 'itens'}`;
  document.querySelector('.price').textContent = total;
  document.querySelector('.cart__empty').hidden = count > 0;
  document.querySelector('.empty-cart').hidden = count === 0;
  document.querySelector('.receipt-meta').textContent = label;
  document.querySelector('.cart-bar-count').textContent = label;
  document.querySelector('.cart-bar-total').textContent = total;
  document.querySelector('.cart-bar').hidden = count === 0;
}

// ---------- Catalog ----------

function setStatus(text) {
  const status = document.querySelector('.status');
  status.textContent = text;
  status.hidden = !text;
}

async function search(query) {
  const items = document.querySelector('.items');
  document.querySelector('.results-title').textContent = query.charAt(0).toUpperCase() + query.slice(1);
  items.replaceChildren();
  setStatus('Carregando produtos...');
  try {
    const response = await authorizedFetch(`/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { results } = await response.json();
    items.replaceChildren(...results.map(createProductItemElement));
    setStatus(results.length ? '' : 'Nenhum produto encontrado. Tente outra palavra.');
  } catch {
    setStatus('Não foi possível carregar os produtos. Tente de novo em alguns segundos.');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const input = document.querySelector('#search-input');
  document.querySelector('.search').addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (query) search(query);
  });
  document.querySelector('.empty-cart').addEventListener('click', () => {
    cart = [];
    saveCart();
    renderCart();
  });
  renderCart();
  search(input.value);
});
