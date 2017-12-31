var body;
var input; 
var button;
var main;

window.onload = ()=>{
	body = document.body;
	main = document.createElement('main');
	input = document.createElement('input');
	label = document.createElement('label');
	label.innerHTML = 'https://api.are.na/v2/channels/';
	input.type = 'text';
	input.placeholder = 'events-1514642507';
	button = document.createElement('button');
	button.addEventListener('click',()=>{
		if (input.value !== '')
			read(label.innerHTML+input.value);
	});
	body.appendChild(label);
	body.appendChild(input);
	body.appendChild(button);
	body.appendChild(main);
}

function read(url){
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
            var data = JSON.parse(request.responseText);
            display(data);
        }
    }
    request.send();
}

function display(data) {

	let channel = document.createElement('div');
	channel.classList.add('channel');

	let h2 = document.createElement('h2');
	h2.innerHTML = data.title;

	channel.appendChild(h2);

	for (content of data.contents){
		let block = document.createElement('div');
		block.classList.add('block');
		let type = content.class.toLowerCase();
		block.classList.add(type);
		switch (type){
			case 'link':
				let link = document.createElement('a');
				let img = document.createElement('img');
				link.href = content.source.url;
				img.src = content.image.square.url;
				link.appendChild(img);
				block.appendChild(link);
			break;
			case 'text':
				block.innerHTML = content.content_html;
			break;
		}
		let span = document.createElement('span');
		span.innerHTML = content.title;
		block.appendChild(span);
		channel.appendChild(block);
	}

	main.appendChild(channel);
}