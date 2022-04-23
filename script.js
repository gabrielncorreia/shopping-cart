const url = 'https://api.mercadolibre.com/sites/MLB/search?q=computador';

function createProductImageElement(imageSource) {
  const img = document.createElement('img');
  img.className = 'item__image';
  img.src = imageSource;
  return img;
}

function createCustomElement(element, className, innerText) {
  const e = document.createElement(element);
  e.className = className;
  e.innerText = innerText;
  return e;
}

function createProductItemElement({ sku, name, image }) {
  const section = document.createElement('section');
  section.className = 'item';
  
  section.appendChild(createCustomElement('span', 'item__sku', sku));
  section.appendChild(createCustomElement('span', 'item__title', name));
  section.appendChild(createProductImageElement(image));
  section.appendChild(createCustomElement('button', 'item__add', 'Adicionar ao carrinho!'));
  
  return section;
}

function getSkuFromProductItem(item) {
  // return item.querySelector('span.item__sku').innerText;
  return item;
}
getSkuFromProductItem('teste');

const getCartItemsOl = () => document.querySelector('.cart__items');
// Requisito 4:
const saveCartState = () => {
  const shopCartItems = getCartItemsOl().innerHTML;
  const totalPriceSpan = document.querySelector('.price').innerText;
  localStorage.setItem('shopCart', shopCartItems);
  localStorage.setItem('totalPrice', totalPriceSpan);
};

const getShopCartFromLocalStorage = () => {
  getCartItemsOl().innerHTML = localStorage.getItem('shopCart');
  document.querySelector('.price').innerText = localStorage.getItem('totalPrice');
};

// Requisito 5:
async function totalPrice() {
  const currentCart = Array.from(document.getElementsByClassName('cart__item'));
  const arraySplit = currentCart.map((product) => product.innerText.split(' '));
  const totalPriceSpan = document.querySelector('.price');
  let prices = [];
  arraySplit.forEach((product) => {
    prices.push(product[product.length - 1]);
  });
  prices = prices.map((price) => price.replace('$', ''));
  prices = prices.map((p) => Number(p));
  totalPriceSpan.innerText = prices.reduce((acc, price) => acc + price, 0);
}

// Requisito 3:
function cartItemClickListener() {
  const currentCartProductsArray = Array.from(document.getElementsByClassName('cart__item'));

  currentCartProductsArray.forEach((product) => {
    product.addEventListener('click', (event) => {
      event.target.remove();
      totalPrice();
      saveCartState();
    });
  });
}

// Requisito 7:
const removeLoading = () => {
  const loading = document.querySelector('.loading');
  loading.remove();
};

function createCartItemElement({ sku, name, salePrice }) {
  const li = document.createElement('li');
  li.className = 'cart__item';
  li.innerText = `SKU: ${sku} | NAME: ${name} | PRICE: $${salePrice}`;
  // li.addEventListener('click', cartItemClickListener);
  return li;
}

// Requisito 2:
const getAllAddCartButtons = () => {
  const addCartButton = document.querySelectorAll('.item__add');
  for (let i = 0; i < addCartButton.length; i += 1) {
    addCartButton[i].addEventListener('click', (event) => {
      const id = event.target.parentNode.firstElementChild.innerText;
      const url2 = `https://api.mercadolibre.com/items/${id}`;
      fetch(url2)
        .then((response) => response.json())
          .then((object) => object).then((result) => {
            const cart = getCartItemsOl();
            console.log(result);
            const { id: sku, title: name, price: salePrice } = result;
            cart.appendChild(createCartItemElement({ sku, name, salePrice }));
            cartItemClickListener();
            totalPrice();
            saveCartState();
          });
    });
  }
};

// Requisito 1:
const fetchAPI = () => {
  fetch(url)
  .then((response) => response.json())
  .then((object) => object.results)
  .then((results) => {
    const itemsSections = document.querySelector('.items');
    results.map(({ id: sku, title: name, thumbnail: image }) => 
    itemsSections.appendChild(createProductItemElement({ sku, name, image }))); 
    // Usamos o .map para iterar sobre o array results, que, em cada chave, contem um objeto com uma chave id, que agora será chamado por sku, uma chave title, que agora será chamada de name, e uma chave thumbnail, que agora será chamada de image.
    const teste = Array.from(results);
    // const teste2 = Array.from(results, ({ id: sku, title: name, thumbnail: image }) => 
    // `${sku}, ${name}, ${image}`); // Dá pra resolver assim tbm. Ai dentro dessa função map vc coloca faz o appendChild.
    console.log(teste.map((produto) => produto.id)); // da na mesma de usar results.map() igual anteriormente
    removeLoading();
    getAllAddCartButtons();
  });
};

window.onload = async () => {
  await fetchAPI();
  const emptyCartButton = document.querySelector('.empty-cart');
  // Requisito 6:
  emptyCartButton.addEventListener('click', () => {
    const cartItems = document.querySelector('.cart__items');
    cartItems.innerHTML = '';
    document.querySelector('.price').innerText = 0;
    saveCartState();
  });
  getShopCartFromLocalStorage();
  cartItemClickListener();
};

window.addEventListener('click', (event) => {
  console.log(event);
});
