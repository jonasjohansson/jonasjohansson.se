window.onload = () => {
	let year = new Date().getFullYear();
	let hours = new Date().getHours();
	if (hours > 18 || hours < 8){
		document.documentElement.classList.add('dark');
	}
	/*let dates = document.querySelectorAll('div[date-start]');
	for (let date of dates){
		let dateStart = date.getAttribute('date-start');
		let dateEnd = date.getAttribute('date-end');
		if (dateStart != null){
			date.setAttribute('date-start',dateStart.substr(0,4));
		}
		if (dateEnd != null){
			if (dateEnd.length <= 4 && dateEnd.length > 0){
				date.setAttribute('date-end',dateEnd.substr(0,4));
			} else {
				date.removeAttribute('date-end');
			}
		}
		// let dateYear = parseInt(dateStart.substr(0,4));
		// if (dateYear < year - 6){
		// 	date.parentNode.removeChild(date);
		// }
	}*/
}