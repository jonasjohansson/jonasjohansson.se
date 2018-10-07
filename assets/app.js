window.addEventListener('load', () => {
	document.body.classList.remove('loading');
	let videos = document.querySelectorAll('video');
	for (let video of videos) video.title = '';
});

document.addEventListener('DOMContentLoaded', () => {
	let date = new Date();
	let dates = document.querySelectorAll('[data-start]');
	for (let date of dates) {
		let dateStart = date.getAttribute('data-start');
		let dateEnd = date.getAttribute('data-end');
		if (dateStart != null) date.setAttribute('data-start', dateStart.substr(0, 4));
		if (dateEnd != null) {
			if (dateEnd.length <= 4 && dateEnd.length > 0) date.setAttribute('data-end', dateEnd.substr(0, 4));
			else date.removeAttribute('data-end');
		}
	}
	(function(i, s, o, g, r, a, m) {
		i['GoogleAnalyticsObject'] = r;
		(i[r] =
			i[r] ||
			function() {
				(i[r].q = i[r].q || []).push(arguments);
			}),
			(i[r].l = 1 * new Date());
		(a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]);
		a.async = 1;
		a.src = g;
		m.parentNode.insertBefore(a, m);
	})(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');
	ga('create', 'UA-4374117-1', 'auto');
	ga('send', 'pageview');
});
