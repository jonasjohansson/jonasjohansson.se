// replace these values with those generated in your TokBox Account
var apiKey = "46094472";
var sessionId = "1_MX40NjA5NDQ3Mn5-MTUyMjgzNjIxOTkyOH5rTmtwSU9IUTRwa3N3QXg1blRkeDVrZld-fg";
var token = "T1==cGFydG5lcl9pZD00NjA5NDQ3MiZzaWc9OGMyYjgzNGViOWM4NjMzNTNiODVkNGU2ZGFmNWZiZTczNzY0MmRlNDpzZXNzaW9uX2lkPTFfTVg0ME5qQTVORFEzTW41LU1UVXlNamd6TmpJeE9Ua3lPSDVyVG10d1NVOUlVVFJ3YTNOM1FYZzFibFJrZURWclpsZC1mZyZjcmVhdGVfdGltZT0xNTIyODM2MjI3Jm5vbmNlPTAuNDIzMzU1NTUzOTA3ODc4MTYmcm9sZT1wdWJsaXNoZXImZXhwaXJlX3RpbWU9MTUyMjgzOTgyNyZpbml0aWFsX2xheW91dF9jbGFzc19saXN0PQ==";
// (optional) add server code here
initializeSession();

// Handling all of our errors here by alerting them
function handleError(error) {
  if (error) {
    alert(error.message);
  }
}

function initializeSession() {
  var session = OT.initSession(apiKey, sessionId);

  // Subscribe to a newly created stream
  session.on('streamCreated', function(event) {
  session.subscribe(event.stream, 'subscriber', {
    insertMode: 'append',
    width: '100%',
    height: '100%'
  }, handleError);
});

  // Create a publisher
  var publisher = OT.initPublisher('publisher', {
    insertMode: 'append',
    width: '100%',
    height: '100%'
  }, handleError);

  // Connect to the session
  session.connect(token, function(error) {
    // If the connection is successful, publish to the session
    if (error) {
      handleError(error);
    } else {
      session.publish(publisher, handleError);
    }
  });
}