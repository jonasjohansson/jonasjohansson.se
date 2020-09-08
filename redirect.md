<html>
	<head>
		<script>
			const url = location.href
      const id = url ? url.split('?')[1] : location.search.slice(1)
      console.log(id)
      const redirects = {
        "undefined": "https://jonasjohansson.se/",
        "vrscifest": "https://jonasjohansson.github.io/virtualdancer/ar",
        "vrscifestbeckmans": "https://jonasjohansson.se/test",
      }
      location.href = redirects[id]
		</script>
	</head>
	<body></body>
</html>
