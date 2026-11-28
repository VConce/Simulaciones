"use strict";

const search = document.querySelector('#search');
const normalize = text => text.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const cards = [...document.querySelectorAll('.card')].map(card => [
  card, normalize(card.textContent + ' ' + card.dataset.keywords + ' ' + card.closest('.topic').querySelector('h2').textContent)
]);
const topics = [...document.querySelectorAll('.topic')];
const count = document.querySelector('#count');
const empty = document.querySelector('#empty');
const jump = document.querySelector('.jump');

function filter() {
  const terms = normalize(search.value).trim().split(/\s+/);
  let visible = 0;
  for (const [card, text] of cards) {
    card.hidden = !terms.every(term => text.includes(term));
    if (!card.hidden) visible++;
  }
  for (const topic of topics) topic.hidden = !topic.querySelector('.card:not([hidden])');
  count.textContent = visible + (visible === 1 ? ' simulación' : ' simulaciones');
  empty.hidden = visible !== 0;
  jump.hidden = Boolean(search.value.trim());
}

if (new URLSearchParams(location.search).has('integrado')) {
  document.documentElement.classList.add('integrado');
  for (const [link] of cards) {
    link.target = '_blank';
    link.rel = 'noopener';
  }
}
search.addEventListener('input', filter);
filter();
