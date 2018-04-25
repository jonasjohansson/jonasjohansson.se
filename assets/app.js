window.addEventListener('load', () => {
	// updateBackground();
	let year = new Date().getFullYear();
	// let hours = new Date().getHours();
	// if (hours > 22 || hours < 6){
	// 	document.body.classList.add('dark');
	// }
	document.body.classList.add('loaded');
	let dates = document.querySelectorAll('div[data-date-start]');
	for (let date of dates){
		let dateStart = date.getAttribute('data-date-start');
		let dateEnd = date.getAttribute('data-date-end');
		if (dateStart != null){
			date.setAttribute('data-date-start',dateStart.substr(0,4));
		}
		if (dateEnd != null){
			if (dateEnd.length <= 4 && dateEnd.length > 0){
				date.setAttribute('data-date-end',dateEnd.substr(0,4));
			} else {
				date.removeAttribute('data-date-end');
			}
		}
		// let dateYear = parseInt(dateStart.substr(0,4));
		// if (dateYear < year - 6){
		// 	date.parentNode.removeChild(date);
		// }
	}
	(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
	(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
	m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
	})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
	ga('create','UA-4374117-1','auto');
	ga('send','pageview');
});

window.addEventListener('scroll', () => {
	// updateBackground();
});

const updateBackground = () => {
	let col = 196;
	let val = window.pageYOffset / document.body.clientHeight;
	val = col+(val*col);
	val = Math.round(val);
	document.body.style.backgroundColor = `rgb(${val},${val},${val})`;
}