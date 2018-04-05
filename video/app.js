var apiKey = "46095352";
var sessionId = "2_MX40NjA5NTM1Mn5-MTUyMjk1NTUzMzg4N34remNVWW8yNVVUWGpYVnlqOER1SEUvbkV-fg";
var token = "T1==cGFydG5lcl9pZD00NjA5NTM1MiZzaWc9OGY4ZmExNmFlNzJiOWE4NjI1YzJlMjE1OWI0Nzg3NDMyMTM3ZWNiODpzZXNzaW9uX2lkPTJfTVg0ME5qQTVOVE0xTW41LU1UVXlNamsxTlRVek16ZzROMzRyZW1OVldXOHlOVlZVV0dwWVZubHFPRVIxU0VVdmJrVi1mZyZjcmVhdGVfdGltZT0xNTIyOTU1NTU1Jm5vbmNlPTAuNjk3NzE5OTQ4NTcwNTM0OCZyb2xlPXB1Ymxpc2hlciZleHBpcmVfdGltZT0xNTI1NTQ3NTU1JmluaXRpYWxfbGF5b3V0X2NsYXNzX2xpc3Q9";

initializeSession();

function handleError(error) {
	if (error) {
		alert(error.message);
	}
}

function initializeSession() {
	var session = OT.initSession(apiKey, sessionId);
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