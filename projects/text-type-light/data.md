---
title: Text Type Light
color: "#8167bf"
date: '2020-12-01'
type: work
tags:
  - light
  - community
blocks:
  - type: image
    src: 01.jpg
    alt: "The words Tillit är en palindrom hang in bright handwritten light above open ground under a violet dusk sky."
  - type: text
    content: >-
      Words sent in through an open call, written into Stockholm at night with
      a stick of light.
  - type: image
    src: 02.jpg
    alt: "Your smile is contagious, written in white script light beneath a dark steel structure against a blue night sky."
  - type: text
    fontSize: small
    content: >-
      Text Type Light was a [Svartljus](/svartljus/) project that began in
      spring 2020 as the COVID-19 Open Call for Text and Type in Light, while
      the pandemic kept people apart. People sent in lines of text, typefaces
      and music. Each line was set in type as an image 144 pixels high, one
      pixel for each LED on a handheld stick, which plays the image back one
      column at a time. We walked the stick through streets, squares and
      station entrances on camera, then built up its trail in TouchDesigner,
      so the words were left standing in the place. The finished pieces went
      out as short films on Instagram.
  - type: image
    src: 03.jpg
    size: half-left
    alt: "Inte för min egen del, written in light across the forecourt of a red building with garage doors at night."
  - type: image
    src: 04.jpg
    size: half-right
    alt: "Utan för alla andras, written in light along a pavement beside the same red building."
  - type: image
    src: 05.jpg
    alt: "We're all in this alone, together, written in light at Sergels torg beside the lit glass obelisk."
  - type: text
    fontSize: small
    content: >-
      The writing happened out in public space, at night, while gatherings
      were restricted. On one walkway a sign read Håll
      avstånd till varandra, keep your distance from each other, and the words
      went up right beside it.
  - type: image
    src: 15.jpg
    size: half-left
    alt: "Här börjar jag, written in rough white light letters on a quay at night, the lit waterfront behind."
  - type: image
    src: 16.jpg
    size: half-right
    alt: "Här slutar du, written in light on a walkway at night beside an orange sign asking people to keep their distance."
  - type: image
    src: 11.jpg
    alt: "Plats för nya tankar, written in white script light across a dark courtyard below a lit arched gateway."
  - type: text
    fontSize: small
    content: >-
      I built the stick around a Teensy 3.6 and a strip of 144 addressable RGB
      LEDs. A small Python script, adapted from one by Lucas Berbesson of La
      Fabrique DIY, turns each image into a text file of colour values, rotated
      so that every column of the image becomes one frame for the strip. The
      files go on the Teensy's SD card. Four buttons pick a file, light every
      LED as a test, and start or stop playback. After start, the first LED
      glows red for three seconds and goes dark for two, time to get into
      position, then the stick shows a new column every 80 milliseconds while
      it is carried along. The firmware is on
      [GitHub](https://github.com/jonasjohansson/pixelstick).
  - type: image
    src: 12.jpg
    alt: "Comment te dire adieu, auf Wiedersehen, written in light along the entrance of Stockholm Centralstation as travellers pass."
  - type: image
    src: 13.jpg
    alt: "Words in broad light letters, starting with Exist, run along a waiting metro train on a striped platform."
  - type: image
    src: 14.jpg
    alt: "Synvilla in jagged light letters beneath a tall metal frame at dusk."
  - type: text
    fontSize: small
    content: >-
      That autumn [Nobel Week Lights](https://nobelweeklights.se/) asked us
      for something similar for their social media, since the Nobel
      festivities that year were digital. We made three new pieces with the
      words Ljus i mörkret, light in the darkness, at Stadshuset, Stadsmuseet
      and Sergels torg, in handwritten lettering by Fredrika Frykstrand, whose
      Synvilla had come in through the open call. We filmed them on 31 October
      2020, and Francesco Torelli wrote the music.
  - type: video
    src: sergels.mp4
    poster: sergels-poster.jpg
    ar: 1.777778
    alt: "A person crosses the wet chequered paving of Sergels torg, leaving the words Ljus i mörkret behind in light."
  - type: image
    src: 06.jpg
    size: half-left
    alt: "Ljus i mörkret in rounded light letters on the quay in front of Stockholm City Hall at dusk."
  - type: image
    src: 07.jpg
    size: half-right
    alt: "Ljus i mörkret in light letters across the rain-wet courtyard of Stadsmuseet, its windows lit."
  - type: image
    src: 08.jpg
    size: half-left
    alt: "A person holds the glowing LED stick on the quay in front of Stockholm City Hall at dusk."
  - type: image
    src: 09.jpg
    size: half-right
    alt: "Two people check the lit LED stick on a balcony above the courtyard of Stadsmuseet."
  - type: image
    src: 10.jpg
    alt: "Outside Kulturhuset Stadsteatern, one person holds the LED stick while another checks a laptop."
  - type: text
    fontSize: small
    content: >-
      The project grew out of Victoria Albrecht's internship with Svartljus in
      spring 2020. I managed the project, built the LED stick and documented
      the shoots, and Victoria handled the technical production.
---
