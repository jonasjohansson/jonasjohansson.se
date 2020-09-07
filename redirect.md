<html>
	<head>
		<script>
			const url = location.href
      const id = url ? url.split('?')[1] : location.search.slice(1)
      console.log(id)
      switch (id) {
				case 'vrscifest':
					location.href = 'https://jonasjohansson.github.io/virtualdancer/ar/'
					break
			}
		</script>
	</head>
	<body></body>
</html>
