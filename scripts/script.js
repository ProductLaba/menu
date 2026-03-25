'use strict';

// ========== ЭЛЕМЕНТЫ ==========
const dialog = document.getElementById('cardDialog');
const newPersonBtn = document.getElementById('newPersonBtn');
const saveCardBtn = document.getElementById('saveCardBtn');
const closeBtn = document.getElementById('closeDialogBtn');
const cardInput = document.getElementById('cardInput');
const productList = document.querySelector('.product-list');

// ========== КОНФИГУРАЦИЯ ==========
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 минут
const STORAGE_KEYS = {
  CARD: 'lentaCard',
  PENDING_URL: 'pendingUrl',
  LAST_ACTIVE: 'lastActive'
};

// ========== ВРЕМЕННОЕ УВЕДОМЛЕНИЕ ==========
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#4CAF50' : '#ff4444'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: 'TildaSans';
    font-size: 16px;
    z-index: 10000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 2000);
}

// ========== ПРОВЕРКА И ОЧИСТКА УСТАРЕВШЕЙ СЕССИИ ==========
function checkAndCleanSession() {
  const lastActive = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE);
  const now = Date.now();
  
  if (lastActive && (now - parseInt(lastActive) > SESSION_TIMEOUT)) {
    sessionStorage.clear();
    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVE);
    console.log('🗑️ Сессия очищена по таймауту');
    showNotification('🔄 Сессия очищена (30 мин бездействия)');
  }
  
  localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, now.toString());
}

// ========== УПРАВЛЕНИЕ ДИАЛОГОМ ==========
function openDialog() {
  dialog.showModal();
  cardInput.value = '';
  cardInput.focus();
}

function closeDialog() {
  dialog.close();
}

// ========== РАБОТА С КАРТОЙ ==========
function saveCard() {
  const rawCard = cardInput.value.replace(/\s/g, '');
  
  if (rawCard.length < 10 || !/^\d+$/.test(rawCard)) {
    showNotification('❌ Введите корректный номер карты (10+ цифр)', 'error');
    return;
  }
  
  sessionStorage.setItem(STORAGE_KEYS.CARD, rawCard);
  showNotification('✅ Карта сохранена');
  closeDialog();
  
  const pendingUrl = sessionStorage.getItem(STORAGE_KEYS.PENDING_URL);
  if (pendingUrl) {
    sessionStorage.removeItem(STORAGE_KEYS.PENDING_URL);
    redirectToPoll(pendingUrl, rawCard);
  }
}

function getSavedCard() {
  return sessionStorage.getItem(STORAGE_KEYS.CARD);
}

// ========== ФОРМАТИРОВАНИЕ НОМЕРА ==========
function formatCardInput() {
  let value = cardInput.value.replace(/\s/g, '');
  let formatted = '';
  
  for (let i = 0; i < value.length; i++) {
    if (i > 0 && i % 4 === 0) {
      formatted += ' ';
    }
    formatted += value[i];
  }
  
  cardInput.value = formatted;
}

// ========== ПЕРЕХОД НА ОПРОС ==========
function redirectToPoll(url, card) {
  const separator = url.includes('?') ? '&' : '?';
  window.location.href = `${url}${separator}card=${encodeURIComponent(card)}`;
}

// ========== НОВЫЙ РЕСПОНДЕНТ ==========
function resetForNewPerson() {
  sessionStorage.clear();
  showNotification('🔄 Данные очищены, введите новую карту');
  openDialog(); // ← диалог открывается сразу
}

// ========== ОБРАБОТКА КЛИКА ПО ПРОДУКТУ ==========
function handleProductClick(event) {
  event.preventDefault();
  
  const link = event.currentTarget;
  const productUrl = link.dataset.url;
  
  if (!productUrl) {
    showNotification('❌ Ошибка: ссылка на опрос не найдена', 'error');
    return;
  }
  
  const savedCard = getSavedCard();
  
  if (!savedCard) {
    sessionStorage.setItem(STORAGE_KEYS.PENDING_URL, productUrl);
    openDialog();
  } else {
    redirectToPoll(productUrl, savedCard);
  }
}

// ========== ОТРИСОВКА ПРОДУКТОВ ==========
function renderProducts(products) {
  productList.innerHTML = '';
  
  products.forEach(product => {
    const li = document.createElement('li');
    li.className = 'button_product';
    
    const a = document.createElement('a');
    a.className = 'link_product';
    a.href = '#';
    a.dataset.url = product.url;
    a.textContent = product.name;
    
    a.addEventListener('click', handleProductClick);
    
    li.appendChild(a);
    productList.appendChild(li);
  });
  
  console.log(`✅ Отрисовано продуктов: ${products.length}`);
}

// ========== ЗАГРУЗКА ПРОДУКТОВ ИЗ JSON ==========
async function loadProducts() {
  try {
    const response = await fetch('products.json?' + Date.now());
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.products || !Array.isArray(data.products)) {
      throw new Error('Неверный формат JSON');
    }
    
    renderProducts(data.products);
    
  } catch (error) {
    console.error('❌ Ошибка загрузки products.json:', error);
    
    productList.innerHTML = `
      <li class="error-message">
        ❌ Не удалось загрузить продукты.<br>
        Пожалуйста, обратитесь к сотруднику.
      </li>
    `;
  }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function init() {
  checkAndCleanSession();
  loadProducts();
  
  newPersonBtn.addEventListener('click', resetForNewPerson);
  saveCardBtn.addEventListener('click', saveCard);
  closeBtn.addEventListener('click', closeDialog);
  
  cardInput.addEventListener('input', formatCardInput);
  
  cardInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveCard();
    }
  });
  
  dialog.addEventListener('close', () => {
    if (!getSavedCard()) {
      sessionStorage.removeItem(STORAGE_KEYS.PENDING_URL);
    }
  });
  
  ['click', 'keypress', 'scroll'].forEach(eventType => {
    document.addEventListener(eventType, () => {
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, Date.now().toString());
    });
  });
}

document.addEventListener('DOMContentLoaded', init);