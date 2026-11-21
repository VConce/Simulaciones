"use strict";
for (const element of document.querySelectorAll('[data-tex]')) {
  katex.render(element.textContent,element,{displayMode:true,throwOnError:false});
}
