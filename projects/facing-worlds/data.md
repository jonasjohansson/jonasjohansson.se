---
title: Facing Worlds
date: "2025-09-01"
tags:
  - mixed reality
  - installation
blocks:
  - type: image
    src: 01.jpg
  - type: text
    content: >-
      A sticker you point a phone at, and the most famous map in Unreal
      Tournament is playing on the table in front of you.
  - type: text
    fontSize: small
    content: >-
      I brought this to Unreal Fest in Stockholm in September 2025, the Epic
      Games event produced by [Happy Times](https://happytimes.se) where I was
      working on light and installation. It was not part of the brief. I have
      loved this game since I was a teenager and wanted to hand people a piece
      of 1999 they could actually play, so I made a sheet of AR stickers — each
      one a portal into Facing Worlds, or a weapon pickup, or a powerup.
  - type: image
    src: 02.jpg
  - type: text
    fontSize: small
    content: >-
      Facing Worlds is the most iconic Unreal Tournament map: two towers on
      asteroids facing each other across a narrow bridge, with Earth looming in
      the background. Its simple, symmetrical design and high-risk layout made
      it legendary for Capture the Flag, where every crossing turned into a
      dramatic showdown.
  - type: video
    src: 03.webm
  - type: text
    fontSize: small
    content: >-
      It runs at [facingworlds.org](https://facingworlds.org), in a browser, on
      whatever you already have in your pocket. No install and no app store —
      you open a link and you are in the match, against whoever else has the
      link open. A WebSocket server owns the score, the flags and every shot, so
      nobody's phone gets to decide who won.
  - type: image
    src: 04.jpg
    size: half-left
  - type: image
    src: 05.jpg
    size: half-right
  - type: text
    fontSize: small
    content: >-
      The map is rebuilt from the original level's own data rather than eyeballed
      from screenshots. A 1999 map is not a model — it is geometry plus a table
      of actors — so the two flag bases, all twenty player starts, the pickups
      and the 166 waypoints come straight out of that table. The fan model I started
      from turned out to be 43% of the real thing: the towers read as 30 metres
      instead of 71, and a flag run took eight seconds instead of nineteen.
      Correcting that one number is most of what makes it feel like the map you
      remember.
  - type: image
    src: 06.jpg
  - type: text
    fontSize: small
    content: >-
      The bots walk Epic's own path network — the 592 connections above are the
      ones the 1999 game's bots used, decoded out of the map file and drawn back
      into the scene. There is also an AR spectator view: point a phone at the
      sticker and the live match plays out on it, flags and all, while everyone
      else is playing it first-person somewhere else.
  - type: video
    src: 07.webm
  - type: credits
    credits:
      - "Shown at: Unreal Fest, Stockholm, September 2025"
      - "Event produced by: [Happy Times](https://happytimes.se)"
      - "Facing Worlds and Unreal Tournament are Epic Games'. This is a fan recreation."
---
