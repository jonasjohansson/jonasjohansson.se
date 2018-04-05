var API_KEY = '46095362';
var SESSION_ID = '1_MX40NjA5NTM2Mn5-MTUyMjk1NzA2NzYzNX5XbHVQNjBPTXo1V01nWUhZZ3RqQWJ1b1p-fg';
var TOKEN = 'T1==cGFydG5lcl9pZD00NjA5NTM2MiZzaWc9ZTBiYThiZTZjN2Y5ZmY1NDk1MzBhYTQ1YmFkODE1MmFmMWQ1MGVhODpzZXNzaW9uX2lkPTFfTVg0ME5qQTVOVE0yTW41LU1UVXlNamsxTnpBMk56WXpOWDVYYkhWUU5qQlBUWG8xVjAxbldVaFpaM1JxUVdKMWIxcC1mZyZjcmVhdGVfdGltZT0xNTIyOTU3NDU0Jm5vbmNlPTAuOTQ2NjUwNjYwNTYxOTExMiZyb2xlPXB1Ymxpc2hlciZleHBpcmVfdGltZT0xNTIyOTYxMDUzJmNvbm5lY3Rpb25fZGF0YT1oZWxsbyUyMHdvcmxkJmluaXRpYWxfbGF5b3V0X2NsYXNzX2xpc3Q9';

initializeSession();

function handleError(error) {
	if (error) {
		alert(error.message);
	}
}

function initializeSession() {
	var session = OT.initSession(API_KEY, SESSION_ID);
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
	session.connect(TOKEN, function(error) {
		// If the connection is successful, publish to the session
		if (error) {
			handleError(error);
		} else {
			session.publish(publisher, handleError);
		}
	});
}