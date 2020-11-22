var cursor = null;
var cursorWidth, cursorHeight;
var cursorTimerStarted = false;
var cursorUpdateInterval = 10;
window.addEventListener("mousemove", (e) => {
  if (cursor === null) {
    cursor = document.getElementById("cursor");
    cursorWidth = cursor.offsetWidth;
    cursorHeight = cursor.offsetHeight;
  } else {
    if (cursorTimerStarted === false) {
      cursorTimerStarted = true;
      setTimeout(function () {
        cursor.innerHTML = String.fromCharCode(
          0x2600 + Math.random() * (0x2600 - 0x2671 + 1)
        );
        cursorTimerStarted = false;
      }, cursorUpdateInterval);
    }
    console.log(cursor.style.top);
    cursor.style.left = e.clientX + "px";
    cursor.style.top = e.clientY + "px";
  }
});
