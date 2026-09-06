(function(){
 'use strict';
 var root=new URL('../../assets/v2/',document.currentScript.src);
 var samples={activity:{file:'prova-es-2.jpg',label:'Cuaderno de propuestas',alt:'Actividad real del PDF: continuar un patrón de círculos y cuadrados',caption:'Una propuesta real del cuaderno. Vista digital del PDF incluido.'},family:{file:'prova-es-1.jpg',label:'Libro de la Familia',alt:'Página real del Libro de la Familia: Empezar con una elección posible',caption:'Una página real de la guía familiar. Vista digital del PDF incluido.'},library:{file:'prova-es-3.jpg',label:'Biblioteca para compartir',alt:'Página real de la Biblioteca sobre Gabriela Mistral',caption:'Una página real de la biblioteca. Vista digital del PDF incluido.'}};
 var image=document.getElementById('sample-image'),link=document.getElementById('sample-link');
 document.querySelectorAll('[data-sample]').forEach(function(button){button.addEventListener('click',function(){
  var selected=samples[button.dataset.sample];if(!selected)return;
  image.src=new URL(selected.file,root).href;image.alt=selected.alt;link.href=image.src;link.setAttribute('aria-label','Ampliar: '+selected.label);
  document.getElementById('sample-label').textContent=selected.label;document.getElementById('sample-caption').textContent=selected.caption;
  document.querySelectorAll('[data-sample]').forEach(function(tab){tab.setAttribute('aria-pressed',String(tab===button));});
 });});
})();
