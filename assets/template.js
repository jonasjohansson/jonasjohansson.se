document.addEventListener('DOMContentLoaded', init);

function init(){
	for (let div of document.querySelectorAll('#work div')){
		div.style.opacity = 0;
		let image = div.querySelector('img');
		image.onload = function(){
			div.style.opacity = 1;
		}
		let title = getTitle(image.src);
		let h4 = document.createElement('h4');
		h4.innerHTML = title;
		image.alt = title;
		div.appendChild(h4);
	}
}

function getTitle(string){
	let ext = string.split('.').pop();
	let path = string.substring(string.indexOf('-')+1);
	let title = path.slice(0,-ext.length-1);
	return decodeURI(title);
}