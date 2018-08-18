// document.addEventListener('DOMContentLoaded', () => {
window.addEventListener('load', () => {
  document.body.classList.add('loaded');
  let videos = document.querySelectorAll('video');
  for (let video of videos){
    video.title = '';
    // video.addEventListener('mousemove',()=>{
    //     let mx = event.clientX;
    //     let ol = video.offsetLeft;
    //     let ow = video.offsetWidth;
    //     let pos = (mx - ol) / ow; 
    //     video.currentTime = pos * video.duration;
    //     video.play();
    // })
    // video.addEventListener('mouseover',()=>{
    //  video.play();
    // })
    // video.addEventListener('mouseout',()=>{
    //  video.pause();
    // })
  }
});
document.addEventListener('DOMContentLoaded', () => {
	let year = new Date().getFullYear();
	let hours = new Date().getHours();
	if (hours > 22 || hours < 6){
		document.documentElement.classList.add('dark');
	}
	let dates = document.querySelectorAll('[data-start]');
	for (let date of dates){
		let dateStart = date.getAttribute('data-start');
		let dateEnd = date.getAttribute('data-end');
		if (dateStart != null){
			date.setAttribute('data-start',dateStart.substr(0,4));
		}
		if (dateEnd != null){
			if (dateEnd.length <= 4 && dateEnd.length > 0){
				date.setAttribute('data-end',dateEnd.substr(0,4));
			} else {
				date.removeAttribute('data-end');
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