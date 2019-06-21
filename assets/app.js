const now = new Date();
var timeout;

window.addEventListener('DOMContentLoaded', () => {
	let transitionItems = document.querySelectorAll('#intro > *, #contact > *, #work > *, #resume > div');
	let i = 0;
	for (let transitionItem of transitionItems) {
		i++;
		transitionItem.classList.add('transition');
		transitionItem.style.transitionDelay = `${i * 100}ms`;
	}
});

window.addEventListener('load', () => {
	document.body.classList.remove('loading');
	let videos = document.querySelectorAll('video');
	for (let video of videos) video.title = '';
	for (let a of document.querySelectorAll('a')) a.target = '_blank';
});

document.addEventListener('DOMContentLoaded', () => {
	toggleDarkTheme();
	parseDates();
	ga();
});

// window.addEventListener('resize', () => {
// 	window.clearTimeout(timeout);
// 	document.documentElement.classList.add('resizing');
// 	timeout = setTimeout(function() {
// 		document.documentElement.classList.remove('resizing');
// 	}, 300);
// });

toggleDarkTheme = () => {
	let h = now.getHours();
	if (h >= 16 || h <= 6) document.documentElement.className = 'dark';
};

parseDates = () => {
	let entries = document.querySelectorAll('[data-start]');
	for (let entry of entries) {
		let dateStart = entry.getAttribute('data-start');
		let dateEnd = entry.getAttribute('data-end');
		if (dateStart != null) entry.setAttribute('data-start', dateStart.substr(0, 4));
		if (dateEnd != null) {
			if (dateEnd.length <= 4 && dateEnd.length > 0) entry.setAttribute('data-end', dateEnd.substr(0, 4));
			else entry.removeAttribute('data-end');
		}
		let dateCheck = dateEnd != null ? dateEnd : dateStart;
		if (now < new Date(dateCheck)) entry.innerHTML = `&#x2192;&#xFE0E; ${entry.innerHTML}`;
	}
};

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
