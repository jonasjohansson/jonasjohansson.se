**Copy review for discussion, 12 September 2026**

Reviewed the About text, site description and all 32 published project pages at
`96f6d1d`. These are suggestions, not approved replacements. The website copy
has not been changed. External Labs and CV documents are outside this review.

My read of your voice: direct, interested in how things are made, personal about
people and places, comfortable with an odd detail or a joke. The conversation
also makes your preferences clear: no em dashes, no inflated descriptions, no
neat little lesson at the end. Casual writing does not need manufactured slang
or the typos of a quick chat message.

The strongest existing material includes the second set of Klättermusen mounts,
leaving the freezing Icehotel room, morning meetings in the pool at Harpa, and
listening to System of a Down in the reactor hall. Those details give the pages
personality without a sentence explaining their significance. They are existing
accounts, not independently verified memories; retain them if they are accurate.

A concrete finding from the history: commit `1e5d3e5` added the little summary
paragraphs in Icehotel, Jag är Gud and NAVA specifically to break up image runs.
They repeat the story because they were written to fill a layout position. I
would remove them. The BorderLAN ending I added is another example of forcing a
conclusion onto a story that already works.

I would start with BorderLAN, WYSIWYG and Kagora, then the obvious summary lines
in Chorus, NAVA, Icehotel and Society Expo. Facing Worlds needs a different kind
of edit: moving the personal origin ahead of the implementation inventory.

Drafts below reuse information in the current copy or supplied in our
conversation. They do not invent motivations, visitor reactions or memories.
Collaborator and source-asset attribution should survive any edit. Questions
marked for discussion identify details that could support better writing.

1. **About and site description** ([source](../../_data/site.json)). Optional voice change.

   The third-person biography is clear, but feels more formal than the project
   pages. A first-person version would make sense here. Keep the specific places
   and people; the affiliation paragraph mainly needs shorter sentences.

   Possible opening: “I'm a designer, artist and educator from Glommen in Halland.
   I studied graphic design in Norrköping, Reims and Stockholm, and have worked
   at studios in Tokyo, Montreal, London and Munich. I taught at Beckmans from
   2017 to 2025 and Hyper Island from 2014 to 2022.”

   The search description's “through play, community, and (un)human intervention”
   is harder to understand than the work. Try: “Jonas Johansson is a designer,
   artist and educator from Glommen, Halland. His work includes light
   installations, interactive artworks and projects with other artists.”

2. **Klättermusen** ([source](../../projects/klattermusen/data.md)). Keep most of it.

   The illustration that was meant as an example but stayed, Rose's folding
   frame, the twenty-kilo rug and the two attempts at the mount are all worth
   keeping. The final paragraph ends on an actual making decision, which works.

   The previewer paragraph becomes a product feature list: “simulates how cut
   pile will render it, tallies the cones to order...” Shorten the explanation
   around the decision: “I built a previewer so they could try the design in
   different yarn colours and see it on the wall. It also calculated how much
   yarn we'd need.” Keep the chosen colours if you want the material detail.

   “Two screws, no rake” is difficult to picture. The 5.8 mm clearance is useful
   because it explains the mount, but that phrase could go.

3. **Kagora** ([source](../../projects/kagora/data.md)). Rewrite the descriptive middle.

   “Define a room without closing it off,” “different curves emerge and recede”
   and “the light gives it a different presence” sound like exhibition copy.
   The scale, the weave, the tools and the named people do more for this page.

   Possible opening and first body paragraph:

   > A nine-metre-wide pavilion of woven LED tubes, built in the woods.
   >
   > Annie Locke Scherer designed the structure, drawing on Japanese basket
   > weaving. I made the lighting. There are 120 tubes, more than a kilometre of
   > LED strip and around 32,000 individually controllable lights.

   Keep the paragraph about LEDger, LED Zeppelin and the twelve controllers.
   It says what you did. Replace the general daylight/night-time description
   with a particular lighting or construction detail if there is one you want
   to tell. Otherwise cut it. Keep the whole team at the end, as requested.
   Moving “I made the lighting” earlier would mean removing its later duplicate,
   while retaining Teodor and Christian's roles.

   For discussion: what was the hardest or most satisfying part of mapping
   light onto the weave? The numbers already establish scale; a real decision
   would give the page more of you.

4. **BorderLAN** ([source](../../projects/borderlan/data.md)). Rewrite the framing; keep the premise.

   “A LAN party in an earth cellar. Four seats, a shared table and a return to
   2002” is already clear and playful. Keep it. “Hosted with Rose” can simply be
   “Rose and I hosted.” Cut “allowing the players' activity to reach beyond
   their screens” and “moving between their worlds.” Describe the connections.

   Possible first body paragraph:

   > Rose and I hosted a LAN party in an earth cellar, with four computers
   > around a shared table. People chose what to play together, with music,
   > food and drinks during each session. The games included Counter-Strike
   > 1.6, Quake II, Unreal Tournament, Heroes III, Diablo and Diablo II, plus
   > Action Quake 2 and OpenArena.

   Possible system paragraph: “The four computers were Raspberry Pi 5s. I made
   a launcher for choosing games and connected the stations to the room's
   sound, lights and projections.” Your work on the software is established
   by the project repository and our conversation.

   Cut the final paragraph beginning “The cellar held a small social world.”
   “The games gave everyone a reason to sit down together” is exactly the tidy
   explanatory ending you are asking to avoid. I wrote it and would remove it.
   Your earlier wish to finish with text can still work: move the practical
   website sentence after its image, for example, “I made a website where
   people could browse the games and book a seat.” A real memory could replace
   that later, but a closing paragraph is not something we need to invent.

5. **WYSIWYG** ([source](../../projects/wysiwyg/data.md)). Bring the mechanism forward.

   “A familiar viewing instrument,” “this other layer of the landscape” and
   “looking at a digital image becomes a physical gesture” put distance between
   the reader and a wonderfully straightforward object. There is a phone in
   a telescope. Start there.

   Possible opening and explanation:

   > A telescope with a phone inside, showing imaginary creatures in the
   > landscape around you.
   >
   > Through the eyepiece, you see birds and figures moving across the camera's
   > view. Turn the telescope and you can follow them across the landscape.

   Possible construction paragraph: “The phone sits inside a round wooden
   housing on a brass telescope. A wooden tripod and a small bench let people
   sit down and look through it.”

   The rendering paragraph can be one line: “These renders and the recording
   show the birds and figures without the live camera background.” Keep the
   technical explanation if useful, but remove “giving each view a different
   real-world backdrop” at the end. The photographs already show that.

   For discussion: how did the telescope idea start, and who made which parts?
   The current documentation does not establish all the physical authorship.
   I would get that from you before writing an “I built...” account.

6. **Society Expo** ([source](../../projects/society-expo/data.md)). Keep the making and the thanks.

   The opening “energy that connects nature, people and a city's future” could
   introduce almost any civic exhibition. Try: “Lighting for Society Expo at
   Skellefteå museum, made with Try New Things.” Let the following paragraph
   explain the four exhibition themes.

   Keep cutting the trees in half, drying them and drilling channels for the
   LEDs. Keep Rose's cloud. Those are specific contributions.

   Cut “The story of the city keeps growing with the people who enter it.” The
   preceding sentence already explains what visitors contribute. The final
   paragraph about loving the team and wanting to visit their office again
   feels personal; keep that warmth. It could be split before the photography
   and film credits to make those easier to find.

7. **Dome Dreaming** ([source](../../projects/dome-dreaming/data.md)). Shorten the art-history detour.

   The origin at a hackathon, the connection with Aavistus and the new venues
   are interesting and personal. The account loses that voice in “a kind of
   pre-internet visual commons” and “finally let that proposition feel like a
   medium.” The latter also gives the history an overly neat resolution.

   If the VanderBeek reference is important, condense the paragraph using the
   existing account: “One reference was Stan VanderBeek's Movie-Drome, where
   audiences lay on the floor under films and slides projected above them.”
   The historical attribution should be checked separately before a substantive
   rewrite. This review is about voice, not a verification of that account.

   “We wanted to show what artists could do with the whole dome” is a plainer
   alternative to “not a planetarium attachment.” Keep the programme, the
   preview tool, Ashley's model, the collaborators and support. The programme
   link is a perfectly useful ending.

8. **Jagad** ([source](../../projects/jagad/data.md)). Light trim.

   The five-storey arcade game, windows as blocks, custom controllers and your
   role are immediately understandable. “Players worked custom arcade
   controllers” could be “People played using arcade controllers on the
   pavement.”

   “Some to chase down their own avatar” is intriguing but unclear after the
   earlier mention of celebrity avatars. Clarify whose avatar is meant before
   using it as the closing detail. The page otherwise needs very little.

9. **Vi kommer i fred** ([source](../../projects/vi-kommer-i-fred/data.md)). Remove repetition.

   The live camera and alien invasion are described in the intro and then
   three more times. Keep one explanation of the experience, then your actual
   role and the day/night versions.

   Possible combined body: “I worked with Smash Studio on the real-time visuals
   and installation. We placed a camera and screen in Kungsträdgården and
   combined the live view with the alien craft in Resolume. I calibrated it on
   site. Day and night versions switched on a timer, and it ran for two weeks.”
   Retain the programme and TV4 commission context in the first paragraph.

10. **Facing Worlds** ([source](../../projects/facing-worlds/data.md)). Reorder and substantially shorten.

   “Browser-native desktop 5v5,” “WebSocket server,” “read-only connection” and
   the feature inventory read like a release announcement. The personal reason
   appears halfway down the page, although it is the strongest starting point.

   Possible lead: “I brought a sheet of Unreal Tournament AR stickers to Unreal
   Fest in Stockholm. Pointing a phone at one put Facing Worlds on the table.
   It was a game I'd loved since I was a teenager.” Then: “It has since grown
   into a browser game. You can play capture the flag on a computer or watch
   the live match through the AR view on a phone.”

   Keep selected technical specifics in a later paragraph, especially the
   incorrectly scaled model and restored towers. Those explain a real problem.
   Drop “now make it a game rather than a map viewer” and “click the page, grab
   a flag and run.” Preserve all original creators, music, asset ownership,
   non-commercial context and model attribution.

11. **Danny Saucedo** ([source](../../projects/danny-saucedo/data.md)). Make the ambition personal.

   “A long-held dream ... realised together with” is the impersonal version of
   an interesting admission. Try: “I'd wanted to work on Melodifestivalen for a
   long time. I joined Smash Studio as technical director for Danny Saucedo's
   Happy That You Found Me.” Keep Smash's design role explicit.

   Three sets of pixel dimensions overwhelm that paragraph. Keep them only
   where they explain a constraint or decision. Rose's maquette and your camera
   tool tell a more specific story. “To test the camera angles” is clearer than
   “to lock a precise direction of photography across the scenes.”

12. **Eastern City Portal** ([source](../../projects/eastern-city-portal/data.md)). Remove the abstract language.

   “A hybrid sculpture” and “a large wooden crack in the fabric of reality”
   make the object harder to picture. The walnut garden in the dry landscape
   is the stronger detail. Keep the history with Erik and Nowhere.

   Possible lead: “A carved wooden portal on Camomile Street in London, with
   an augmented-reality view through it.” The line “I like these kinds of
   pieces” is personal but unspecific. It could become “I like working with
   carved wood and AR together. Here, the painted patterns also had to work
   as tracking markers.” Confirm that this is what you liked about it.

   “Getting the carved patterns to read as AR markers took the most tuning”
   could be useful if it is a real memory. The three layers need explaining
   before “so the three layers landed” means anything. Otherwise cut that line.

13. **Firestarter** ([source](../../projects/firestarter/data.md)). Keep the experiment; cut the imposed symbolism.

   Keep wanting to work with fire, learning the propane systems, building with
   Erik and Rose, and lighting the closing ceremony. “A small, rebellious act
   of speaking up” assigns the work a message that the rest of the account
   does not establish.

   Possible passage: “I wanted to work with fire as a material. Erik, Rose and
   I built an oversized Zippo and learned how to work with propane, sensors
   and ignition triggers. Visitors could light it with a flame of their own.”
   If speaking up was your actual intention, tell that story directly rather
   than leaving it as a slogan.

14. **Jag är Gud** ([source](../../projects/jag-ar-gud/data.md)). Bring the focus back to the collaboration.

   The detailed show synopsis takes over the page. Some of that context belongs
   here, but the relationships, months of conversation and staging decisions
   are where your voice enters. Introduce the piece and collaborators, use a
   shorter synopsis, then say what you and Rose made.

   Possible lead: “Video, scenography and lighting for Jag är Gud, Danne
   Dahlin's autobiographical stage piece about living with bipolar disorder.”
   “Sold-out” can stay as a factual production note rather than the opening
   credential.

   Cut the late “so his stories can hold the room” paragraph. It repeats the
   account of simple lighting and was added to break up images. Keep the
   review's attribution if the quote stays. For discussion: what was one
   concrete scene, cue or set element you and Rose worked through with Danne?

15. **Resonance** ([source](../../projects/resonance/data.md)). Break up the single dense paragraph.

   This is already specific. Separate the visitor interaction from the
   construction, without padding either. “People could jump on four pads in
   the square to send colour across the building. Activating all four together
   triggered a sequence of light and music.” Then explain weatherproofing,
   Arduino, the scan and scale model.

   Work Rose into the making sentence instead of leaving “Built together with
   Rose Hallgren” detached at the end. Keep Smash's collaboration credit.
   There is no need for an additional conclusion.

16. **Sala Hjärtslag** ([source](../../projects/sala-hjartslag/data.md)). Small wording change only.

   The page is short and clear about your role. Replace “an audiovisual journey
   through 400 years” with “a projection about Sala's 400-year history.” Keep
   the curved facade and on-site alignment. If you remember a particular
   difficulty with that shape, it could add something; the text does not need
   to be longer just to match the other pages.

17. **Tufting Ex Machina** ([source](../../projects/tufting-ex-machina/data.md)). Explain the activity before the theory.

   “Tuft their own cultural canon” is much less immediate than the actual
   process. Try: “Rose and I ran a two-day tufting workshop at Aavistus in
   Helsinki. People worked on squares and passed them to the next group,
   responding to each other's shapes, colours and patterns.” Then name the
   exquisite corpse method in a short sentence.

   Keep learning to tuft at Konvent Zero, Rose's frame fitting into a sports
   bag, and the conductive thread and music. Before rewriting the method,
   reconcile “10 participants” with “two groups of four”: the text does not
   explain whether the other two were facilitators or participants.

18. **Icehotel** ([source](../../projects/icehotel/data.md)). Protect the personal account.

   The father connection, the odd trio, questionable working methods, leaving
   the room because it was too cold, and admitting Jordi and Abel did most of
   the later build are excellent material. Don't smooth the awkward or funny
   parts out of this page.

   “The seed was planted twice” can simply become “I first heard about working
   at Icehotel when I was 19.” Split the long 2023 paragraph so the room and the
   circumstances of the build each have space.

   Cut “Every detail had to sell the scene ... waiting for someone to piece it
   together.” It repeats the train narrative and was added as a layout spacer.
   The wish to return with Rose and Erik is a much more personal final thought.

19. **People in Orbit** ([source](../../projects/people-in-orbit/data.md)). Keep the influences; simplify the explanation.

   Meeting Adam, Bosch, Hilma af Klint, Tove Jansson and Junji Ito gives this
   its character. “Takes a macro perspective” and “the contrast of those two
   realms ... became the foundation” make a simple visual relationship sound
   theoretical.

   Try: “For Viewpoint, I drew on Tove Jansson's Moominpappa at Sea and Junji
   Ito's Uzumaki, with a lighthouse at the centre. The singles each take a
   closer view: a whale's eye, a whirlpool and the lighthouse lens.” Keep the
   dates, titles, labels and live-score work around that shorter explanation.

20. **Chorus** ([source](../../projects/chorus/data.md)). Cut the motivational ending; check the anecdote.

   The voice input, NASA recording and work with Tove are interesting. The
   last paragraph repeats how the voice particles work, then ends with
   “Getting that feeling right is what kept us going in the container.” That
   sounds written to resolve the story.

   If the interaction really had this requirement, reduce it to: “With lots
   of people singing at once, we still needed each person to recognise the
   particle responding to their voice.” No final sentence explaining what
   kept everyone motivated.

   The freezing container is worth keeping if accurate. “As our breath fogged
   the laptops” is cinematic enough that I would ask whether it actually
   happened before preserving it as an authentic detail. A quieter version
   would be “Both years we worked from a freezing cargo container on the
   square.” No need to invent hardship to make the work personal.

21. **Heroes** ([source](../../projects/heroes/data.md)). Make your role clearer, with no added drama.

   “Real-life statues, drone-scanned architecture” is a cryptic lead. Try:
   “A projection on Stockholm's Great Synagogue, honouring Raoul Wallenberg
   and Dag Hammarskjöld.” The scans and high-contrast animation belong in the
   explanation that follows. Keep the commissioners and composer.

   Your exact contribution is less clear here than on adjacent projects.
   Establish that with you before adding first-person claims. The current
   account does not need a reflective ending.

22. **Lights for Ukraine** ([source](../../projects/lights-for-ukraine/data.md)). Mostly keep.

   The open call, rented metro-station booth, making the signs, auction system
   and destination of proceeds are concrete. A more direct first sentence
   would be: “I rented Shoof, Samira Bouabana's booth gallery in Hornstull
   metro station, for a month and invited illustrators to submit work.”

   Split the making and the auction into separate paragraphs. Keep Rose and
   Eugenia's roles. End on what happened to the proceeds; it needs no moral.

23. **Retrospectives** ([source](../../projects/retrospectives/data.md)). Keep the humour.

   “Massive glasses” is the kind of blunt ending I would keep. It belongs to
   this particular object and does not make a claim about what art or community
   means. “Nothing more, nothing less” could go without losing the joke.

   Shorten the doubled “obsessed ... obsession” sentence: “I'd become obsessed
   with The Tilehunter, who documents and rescues Catalan tiles. I kept working
   with those patterns during a residency at Konvent Zero.” Keep Erik making
   the glasses and driving them into the desert. This page does not need to
   become more serious.

24. **Visualia** ([source](../../projects/visualia/data.md)). Make the origin more direct.

   “The idea of pairing artists to make something new kept pulling at me” is
   a polished way of saying what the Harpa connection already explains. Try:
   “At Harpa we paired visual artists with musicians. I wanted to give people
   longer to work together, so I started a residency in the old school in
   Glommen, where I grew up.” The wish for more time is a proposed interpretation
   to confirm with you; without that confirmation, simply say the residency
   grew out of those collaborations.

   Keep the building, people, artworks and support. The edition-by-edition
   paragraph is getting list-like. You could give one work more room and keep
   the other names in a shorter account, without cutting their attribution.
   Also clarify the usual two-artist format against the three residents named
   for 2024. It may be a deliberate variation; the reader needs one sentence.

25. **Embed** ([source](../../projects/embed/data.md)). Keep it short.

   This already explains an unusual room without an unnecessary closer. The
   first-person initiation and collaborator names are useful. Replace
   “an elaborate speaker system” with a concrete description if the sound
   setup matters, or simply “a sound system.” No need to add a philosophy of
   immersion to a room people could actually book and use.

26. **Emerging Sensation** ([source](../../projects/emerging-sensation/data.md)). Keep the personal ending.

   “I spent days and nights in that reactor hall, listening to System of a Down
   and going slightly insane” has much more personality than a sentence about
   physical and digital worlds meeting. Keep it if it accurately reflects your
   experience. It is a particular memory, not an attempt to explain the value
   of the whole project.

   The mechanism could be easier to follow. After explaining Malin's textiles,
   try: “I programmed the light animations and the connection to the HoloLens.
   Touching the fabric changed the lights and sent a signal to the AR work.”
   Keep Björn and Jonatan's mixed-reality role. Arduino and OSC can stay if you
   want that level of detail, but do not need several explanatory links.

27. **Tiny/Massive** ([source](../../projects/tinymassive/data.md)). Keep the dimensions and the bus.

   The 77-by-13-pixel facade is an excellent opening. Cut “The name says it all,”
   “tiny-but-massive canvas” and “the response was strong, with well-known
   generative artists contributing.” The last clause is vague self-praise;
   name someone and their contribution if it matters.

   The bus, arcade tabletop, artist kits, student course and Loney Dear playing
   the building are plenty. Your role is clear. The funding and collaborators
   can remain the ending.

28. **Vista** ([source](../../projects/vista/data.md)). Start with Montreal; handle Glommen gently.

   The dictionary-like “an extensive mental view over a stretch of time”
   creates distance. Try: “I started Vista while living in Montreal in 2012.
   They're browser-based landscapes with generative terrain, light and sound.”
   Then go straight to the mountain on Rue des Pins and the foam structures
   behind Grotta.

   Keep the family connection in Glommen. It is among the most personal
   material on the site. I would not rewrite the anticipation of losing your
   father without talking with you about how you want it expressed. Avoid
   turning it into a more dramatic story. “A desire to keep something floating
   still, in movement” in Pilgrim is also worth asking you about: if it is your
   own phrasing and feeling, it can stay. The goal is not to remove all poetry.

29. **Harpa** ([source](../../projects/harpa/data.md)). Keep the memories; clarify the opening attribution.

   Morning meetings in the pool, working with Owen after meeting at FIELD,
   and playing the facade in the evenings all belong here. “It was a great few
   years” works because actual memories follow it.

   The opening “We turned ... into a public game, then an instrument” can imply
   you worked on the 2014 Pong version, while the body says you joined in 2015.
   A more precise first-person lead would be: “I joined Atlí and Owen in 2015
   to make light and interactive work for Harpa's facade in Reykjavík.” The
   history of their Pong project can still set up what followed.

   Some of the later history duplicates Tiny/Massive and NAVA. Shorten that
   recap and use the project links, keeping Rose, Johanna, the performers and
   supporters credited. No need to turn “the spark for NAVA” into a grander
   origin story than the actual collaboration.

30. **Svartljus** ([source](../../projects/svartljus/data.md)). Keep the group history; simplify the recent-work paragraph.

   Starting at Stugan, connecting with Olle and Markus, making a tunnel and
   growing the group is a good account. Dendrolux has useful specifics too.

   The Unreal Fest paragraph becomes unusually mannered: “splayed out of a
   single base,” “a hard-angled frame on the brick,” and “it kept counting while
   the hall filled up behind it.” Try: “For Unreal Fest Stockholm, we brought
   Minigun, a sculpture of three-metre LED tubes, a countdown display and
   Facing Worlds, the AR sticker project.” Keep any technical detail that
   explains how one of them actually worked.

   Introduce the Wood Wide Web as an inspiration rather than using “trees
   communicate” as a complete scientific explanation. Keep the current team
   and internship account. Those people are more important than a closing
   statement about the collective's purpose.

31. **Transcend** ([source](../../projects/transcend/data.md)). Keep the Indiana Jones reference.

   The hidden ancient machine, discovering hand sensing for the first time and
   people pulling friends over are specific and easy to picture. The technical
   paragraph just needs splitting at the point where you describe the visitors.

   The Creation of Adam reference appears in both the lead and the body; one
   is enough. “It was my first time working with Pepper's Ghost and hand
   sensing” is a straightforward personal ending. Keep the collaborators and
   the account of the hand interaction.

32. **NAVA** ([source](../../projects/nava/data.md)). Cut the mission-style recap.

   Remove “A week together in a cabin or a silo, then the piece on stage: that
   rhythm is what NAVA is really about.” The previous paragraph describes the
   residencies concretely, and this sentence was added to interrupt images.
   It is not needed to explain the organisation.

   The VJing history, Montreal collective, cancelled festival and quickly
   organised replacement are worth keeping. The paragraph about being early
   has several disclaimers about influence and is harder to read. It could
   end at “NAVA continued the same thread,” or use a simple personal assessment
   of that time if you want one. Avoid ranking the organisation's place in a
   movement unless that is the point of the page.

   “Currently working on DOME DREAMING” also needs checking against the
   completed May 2026 festival described on its own page. Clarify whether this
   means a next edition. This is an internal chronology flag, not an external
   check of the organisation's current programme.

33. **Lyra** ([source](../../projects/lyra/data.md)). Small trim.

   Replace “my first foray into interactive light art” with “my first
   interactive light installation.” Keep Melanie, Moment Factory, the fishing
   wire and accelerometers.

   “The more people played, the richer it got” is vague. If it is useful to
   state, say what increased, for example more simultaneous light and sound,
   but only if that describes the actual behaviour. Otherwise cut it. Arduino
   can sit in the making sentence instead of a detached “Built on Arduino”
   at the end.

**A few things to establish before rewriting**

The most useful questions are specific to the work: WYSIWYG's origin and shared
authorship, a real lighting decision from Kagora, the meaning of “their own
avatar” in Jagad, the participant count in Tufting Ex Machina, your exact role
in Heroes, and whether the vivid container detail in Chorus is yours. The
family passage in Vista deserves its own conversation if you want to change it.

An initial editing round could remove the obvious repeated summary lines and
simplify BorderLAN's framing. A second could work through WYSIWYG and Kagora
with your answers. Existing plain, funny or vulnerable lines should survive;
there is no reason for every page to have the same tone or amount of text.
