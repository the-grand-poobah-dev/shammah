-- =============================================================================
-- Shammah Seed File: supabase/seed_arcade.sql
-- Purpose: 5 Arcade games + 100 Bible Trivia questions bank (OT & NT)
--          + initial daily seeds and sample scores.
-- 100% IDEMPOTENT & SAFE TO RUN MULTIPLE TIMES.
-- =============================================================================

DO $$
DECLARE
  v_first_user uuid;
  v_church_id uuid;
BEGIN
  SELECT id, church_id INTO v_first_user, v_church_id
  FROM public.profiles
  ORDER BY created_at ASC
  LIMIT 1;

  -- 1. SEED ARCADE GAMES
  INSERT INTO public.arcade_games (slug, title, description, icon, accent, kind, max_plausible_score, min_duration_ms, is_active)
  VALUES
    (
      'trivia',
      'Bible Champions Trivia',
      'Test your Bible knowledge against the clock! Fast-paced quiz questions across all 66 books.',
      '🏆',
      '#f59e0b',
      'quiz',
      5000,
      3000,
      true
    ),
    (
      'david',
      'David vs Goliath Sling',
      'Step into the Valley of Elah. Adjust your sling angle and release tension to bring down the Philistine giant in the name of the Lord!',
      '🎯',
      '#0ea5e9',
      'arcade',
      2500,
      2000,
      true
    ),
    (
      'ark',
      'Noah’s Ark Pair Rescue',
      'Match animal pairs two-by-two before the torrential rains start to safely board the Ark of the Covenant.',
      '🚢',
      '#10b981',
      'match',
      2000,
      3000,
      true
    ),
    (
      'scramble',
      'Scripture Scramble',
      'Unscramble inspired verses word by word before time runs out. Train your mind to retain God’s holy word.',
      '🧩',
      '#8b5cf6',
      'puzzle',
      3000,
      3000,
      true
    ),
    (
      'match',
      'Memory Verse Match',
      'Flip cards and match famous Bible references with their true scriptures. Sharp memory builds steadfast faith.',
      '📖',
      '#ec4899',
      'memory',
      2500,
      3000,
      true
    )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    accent = EXCLUDED.accent,
    kind = EXCLUDED.kind,
    max_plausible_score = EXCLUDED.max_plausible_score;

  -- 2. SEED TODAY'S DAILY CHALLENGE
  INSERT INTO public.arcade_daily (game_slug, day, seed, bonus_multiplier)
  VALUES
    ('trivia', CURRENT_DATE, 'daily-seed-' || to_char(CURRENT_DATE, 'YYYYMMDD'), 2.0),
    ('scramble', CURRENT_DATE, 'daily-seed-' || to_char(CURRENT_DATE, 'YYYYMMDD'), 2.0)
  ON CONFLICT (game_slug, day) DO NOTHING;

  -- 3. SEED 100 COMPREHENSIVE BIBLE TRIVIA QUESTIONS
  -- Clean slate or refresh questions table
  DELETE FROM public.arcade_questions;

  -- --- LAW / TORAH (Genesis - Deuteronomy) ---
  INSERT INTO public.arcade_questions (question, options, correct_index, reference, category, testament, difficulty) VALUES
  ('In how many days did God create the heavens and the earth before resting on the seventh?', '["5 days", "6 days", "7 days", "10 days"]'::jsonb, 1, 'Genesis 2:1-2', 'Law', 'OT', 'kids'),
  ('Who was the first woman created by God, formed from Adam''s rib?', '["Sarah", "Eve", "Miriam", "Rachel"]'::jsonb, 1, 'Genesis 2:22', 'Law', 'OT', 'kids'),
  ('What was the sign of God''s covenant never to destroy all life with a flood again?', '["A burning bush", "A rainbow", "A pillar of cloud", "An olive branch"]'::jsonb, 1, 'Genesis 9:13', 'Law', 'OT', 'kids'),
  ('Which son of Isaac was born second, clutching his twin brother''s heel?', '["Esau", "Jacob", "Joseph", "Benjamin"]'::jsonb, 1, 'Genesis 25:26', 'Law', 'OT', 'teens'),
  ('What special garment did Jacob give his favorite son Joseph?', '["A golden breastplate", "A tunic of many colors", "A linen ephod", "A royal mantle"]'::jsonb, 1, 'Genesis 37:3', 'Law', 'OT', 'kids'),
  ('In what body of water was infant Moses placed in a papyrus basket?', '["The Jordan River", "The Nile River", "The Red Sea", "The Euphrates"]'::jsonb, 1, 'Exodus 2:3', 'Law', 'OT', 'kids'),
  ('Through what supernatural sight did God first call Moses at Mount Horeb?', '["A flying eagle", "A burning bush that was not consumed", "A thunderous earthquake", "A parted river"]'::jsonb, 1, 'Exodus 3:2', 'Law', 'OT', 'kids'),
  ('How many plagues did the Lord send upon Egypt before Pharaoh released the Israelites?', '["7", "10", "12", "40"]'::jsonb, 1, 'Exodus 7-12', 'Law', 'OT', 'teens'),
  ('What miraculous bread from heaven fed the Israelites in the wilderness for 40 years?', '["Manna", "Lentils", "Unleavened pitas", "Barley cakes"]'::jsonb, 0, 'Exodus 16:31', 'Law', 'OT', 'kids'),
  ('On which holy mountain did Moses receive the Ten Commandments on stone tablets?', '["Mount Carmel", "Mount Sinai", "Mount Nebo", "Mount Moriah"]'::jsonb, 1, 'Exodus 19:20', 'Law', 'OT', 'kids'),
  ('What is the very first commandment of the Decalogue in Exodus 20?', '["Honor your father and mother", "You shall have no other gods before Me", "Remember the Sabbath day", "You shall not steal"]'::jsonb, 1, 'Exodus 20:3', 'Law', 'OT', 'teens'),
  ('Which tribe of Israel was consecrated specifically for priestly duties and tabernacle service?', '["Judah", "Ephraim", "Levi", "Dan"]'::jsonb, 2, 'Numbers 3:6', 'Law', 'OT', 'teens'),
  ('How many spies were sent into the land of Canaan to scout its fruits and fortified cities?', '["2", "7", "12", "70"]'::jsonb, 2, 'Numbers 13:2', 'Law', 'OT', 'teens'),
  ('Which two faithful spies declared that with the Lord they could certainly take the Promised Land?', '["Moses and Aaron", "Joshua and Caleb", "Gideon and Samson", "Eleazar and Phinehas"]'::jsonb, 1, 'Numbers 14:6-9', 'Law', 'OT', 'youth'),
  ('What miraculous event occurred to Aaron''s staff to confirm his divine priesthood?', '["It turned to solid gold", "It sprouted, budded, and produced ripe almonds", "It parted the waters of Mara", "It consumed bronze serpents"]'::jsonb, 1, 'Numbers 17:8', 'Law', 'OT', 'youth'),
  ('What creature spoke to the pagan prophet Balaam when an angel of the Lord blocked his road?', '["A camel", "A donkey", "A lion", "An eagle"]'::jsonb, 1, 'Numbers 22:28', 'Law', 'OT', 'kids'),
  ('From what mountain did Moses view the Promised Land before his death?', '["Mount Nebo", "Mount Tabor", "Mount Ararat", "Mount Hermon"]'::jsonb, 0, 'Deuteronomy 34:1', 'Law', 'OT', 'youth'),
  ('According to the Shema in Deuteronomy 6:5, how should believers love the Lord God?', '["With quiet reserve", "With all your heart, soul, and strength", "Through daily sacrifices alone", "By keeping ancient genealogies"]'::jsonb, 1, 'Deuteronomy 6:5', 'Law', 'OT', 'teens'),

  -- --- HISTORICAL BOOKS (Joshua - Esther) ---
  ('Whose household was spared when the walls of Jericho miraculously collapsed outward?', '["Delilah", "Rahab the harlot", "Deborah", "Jael"]'::jsonb, 1, 'Joshua 6:25', 'History', 'OT', 'teens'),
  ('What celestial miracle took place when Joshua fought against the Amorite kings at Gibeon?', '["A fiery comet fell", "The sun and moon stood still for nearly a whole day", "The stars rained down", "A lunar eclipse parted the clouds"]'::jsonb, 1, 'Joshua 10:12-13', 'History', 'OT', 'teens'),
  ('Which female judge and prophetess of Israel led the nation to victory over Sisera?', '["Ruth", "Deborah", "Hannah", "Huldah"]'::jsonb, 1, 'Judges 4:4', 'History', 'OT', 'teens'),
  ('With how many men did Gideon defeat the vast army of Midian after the Lord weeded out the fearful?', '["300", "1,000", "7,000", "12,000"]'::jsonb, 0, 'Judges 7:7', 'History', 'OT', 'kids'),
  ('What Nazarite vow gave Samson supernatural physical strength?', '["No meat", "Never cutting his hair and drinking no wine", "Fasting every full moon", "Wearing only camel hair"]'::jsonb, 1, 'Judges 13:5', 'History', 'OT', 'kids'),
  ('Who uttered the famous loyalty pledge: "Where you go I will go, and where you stay I will stay; your people will be my people and your God my God"?', '["Orpah", "Ruth", "Esther", "Abigail"]'::jsonb, 1, 'Ruth 1:16', 'History', 'OT', 'teens'),
  ('Who was the faithful mother of the prophet Samuel who prayed silently in tears at Shiloh?', '["Peninnah", "Hannah", "Elisabeth", "Sarah"]'::jsonb, 1, '1 Samuel 1:10', 'History', 'OT', 'kids'),
  ('Who was anointed as the very first king of the unified kingdom of Israel?', '["David", "Saul", "Solomon", "Rehoboam"]'::jsonb, 1, '1 Samuel 10:1', 'History', 'OT', 'kids'),
  ('From what Philistine city did the giant warrior Goliath originate?', '["Ashkelon", "Gaza", "Gath", "Ekron"]'::jsonb, 2, '1 Samuel 17:4', 'History', 'OT', 'teens'),
  ('Who was King Saul''s courageous son and David''s covenant soul-brother?', '["Absalom", "Jonathan", "Ish-bosheth", "Abner"]'::jsonb, 1, '1 Samuel 18:1', 'History', 'OT', 'teens'),
  ('Which city did King David capture from the Jebusites and establish as the national capital?', '["Hebron", "Jerusalem (Zion)", "Bethel", "Samaria"]'::jsonb, 1, '2 Samuel 5:7', 'History', 'OT', 'teens'),
  ('Which prophet boldly confronted King David about his sin with Bathsheba using a parable of a pet ewe lamb?', '["Samuel", "Nathan", "Gad", "Elijah"]'::jsonb, 1, '2 Samuel 12:1-7', 'History', 'OT', 'youth'),
  ('When God appeared to young King Solomon in a dream and offered him anything, what did he request?', '["Long life and riches", "Wisdom and an understanding heart to govern God''s people", "Victory over all foreign armies", "Magnificent gold palaces"]'::jsonb, 1, '1 Kings 3:9', 'History', 'OT', 'kids'),
  ('Which great prophet called down fire from heaven in a duel against 450 prophets of Baal at Mount Carmel?', '["Elisha", "Elijah", "Isaiah", "Jeremiah"]'::jsonb, 1, '1 Kings 18:38', 'History', 'OT', 'kids'),
  ('How was the prophet Elijah caught up into heaven without dying?', '["In a gentle whisper", "In a whirlwind with chariots and horses of fire", "From the top of Mount Sinai", "In an ark of cedar wood"]'::jsonb, 1, '2 Kings 2:11', 'History', 'OT', 'kids'),
  ('What Syrian army general was cleansed of leprosy after dipping seven times in the Jordan River as instructed by Elisha?', '["Ben-Hadad", "Naaman", "Hazael", "Sennacherib"]'::jsonb, 1, '2 Kings 5:14', 'History', 'OT', 'teens'),
  ('Which righteous 8-year-old boy became king and led Judah back to God after the Book of the Law was rediscovered in the temple?', '["Hezekiah", "Josiah", "Uzziah", "Manasseh"]'::jsonb, 1, '2 Kings 22:1', 'History', 'OT', 'teens'),
  ('Which Persian royal cupbearer led the rebuilding of Jerusalem''s ruined walls in just 52 days?', '["Ezra", "Nehemiah", "Zerubbabel", "Mordecai"]'::jsonb, 1, 'Nehemiah 6:15', 'History', 'OT', 'teens'),
  ('Which Jewish orphan girl became queen of Persia and risked her life proclaiming: "If I perish, I perish"?', '["Vashti", "Esther (Hadassah)", "Ruth", "Susanna"]'::jsonb, 1, 'Esther 4:16', 'History', 'OT', 'kids'),

  -- --- POETRY & WISDOM (Job - Song of Songs) ---
  ('In the midst of agonizing loss, what did Job famously confess about his Redeemer?', '["I know that my Redeemer lives, and that in the end He will stand on the earth", "God has deserted me forever", "My hope is vanished like vapor", "The grave is my only friend"]'::jsonb, 0, 'Job 19:25', 'Poetry', 'OT', 'youth'),
  ('Complete Psalm 23:1: "The Lord is my shepherd, I shall not _______."', '["fear", "want (lack nothing)", "stumble", "faint"]'::jsonb, 1, 'Psalm 23:1', 'Poetry', 'OT', 'kids'),
  ('According to Psalm 119:105, what is God''s word compared to?', '["A roaring lion", "A lamp for my feet and a light on my path", "A golden crown", "A shield of bronze"]'::jsonb, 1, 'Psalm 119:105', 'Poetry', 'OT', 'kids'),
  ('Which Psalm begins with: "Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty"?', '["Psalm 23", "Psalm 91", "Psalm 121", "Psalm 139"]'::jsonb, 1, 'Psalm 91:1', 'Poetry', 'OT', 'teens'),
  ('Proverbs 3:5-6 instructs believers to: "Trust in the Lord with all your heart, and lean not on _______."', '["your own understanding", "horses and chariots", "earthly wealth", "the counsel of strangers"]'::jsonb, 0, 'Proverbs 3:5', 'Poetry', 'OT', 'kids'),
  ('Proverbs 9:10 teaches that the fear of the Lord is the beginning of what?', '["Sorrow", "Wisdom", "Pride", "Power"]'::jsonb, 1, 'Proverbs 9:10', 'Poetry', 'OT', 'kids'),
  ('In Proverbs 31, what attribute of a godly woman is praised as surpassing passing charm and fleeting beauty?', '["Her royal lineage", "Her fear of the Lord", "Her jewelry and silks", "Her skill in trade"]'::jsonb, 1, 'Proverbs 31:30', 'Poetry', 'OT', 'teens'),
  ('According to Ecclesiastes 3:1, what has God ordained for everything under heaven?', '["Perpetual labor", "A season and a time for every matter under heaven", "Eternal youth", "Endless sorrow"]'::jsonb, 1, 'Ecclesiastes 3:1', 'Poetry', 'OT', 'teens'),

  -- --- PROPHETS (Isaiah - Malachi) ---
  ('In Isaiah''s heavenly vision in chapter 6, what words do the seraphim cry continually to one another?', '["Praise the Lord all the earth!", "Holy, holy, holy is the Lord of hosts; the whole earth is full of His glory!", "Grace and mercy unto Zion!", "Behold the Lamb!"]'::jsonb, 1, 'Isaiah 6:3', 'Prophecy', 'OT', 'teens'),
  ('Which famous prophecy in Isaiah 7:14 predicted the virgin birth of Jesus?', '["Behold, the virgin shall conceive and bear a Son, and shall call His name Immanuel", "A ruler will come from Bethlehem Ephrathah", "Out of Egypt I called My Son", "He shall be called a Nazarene"]'::jsonb, 0, 'Isaiah 7:14', 'Prophecy', 'OT', 'teens'),
  ('According to Isaiah 40:31, those who wait on the Lord will renew their strength and soar like what bird?', '["Doves", "Eagles", "Sparrows", "Falcons"]'::jsonb, 1, 'Isaiah 40:31', 'Prophecy', 'OT', 'kids'),
  ('Which chapter in Isaiah is renowned as the "Suffering Servant" prophecy describing Christ pierced for our transgressions?', '["Isaiah 9", "Isaiah 40", "Isaiah 53", "Isaiah 61"]'::jsonb, 2, 'Isaiah 53:5', 'Prophecy', 'OT', 'youth'),
  ('Which prophet was known as the "Weeping Prophet" because of his profound sorrow over fallen Jerusalem?', '["Ezekiel", "Jeremiah", "Amos", "Hosea"]'::jsonb, 1, 'Jeremiah 9:1', 'Prophecy', 'OT', 'teens'),
  ('Complete Jeremiah 29:11: "''For I know the plans I have for you,'' declares the Lord, ''plans to _______.''"', '["judge you in righteousness", "prosper you and not to harm you, to give you a future and a hope", "test you in the furnace of affliction", "keep you in exile for a century"]'::jsonb, 1, 'Jeremiah 29:11', 'Prophecy', 'OT', 'kids'),
  ('Which prophet witnessed the dramatic vision of the valley of dry bones coming back to life by the breath of God?', '["Daniel", "Ezekiel", "Haggai", "Zechariah"]'::jsonb, 1, 'Ezekiel 37:1-10', 'Prophecy', 'OT', 'youth'),
  ('What Hebrew names did Shadrach, Meshach, and Abednego carry before being renamed in Babylon?', '["Hananiah, Mishael, and Azariah", "Shem, Ham, and Japheth", "Eliab, Abinadab, and Shammah", "Nadab, Abihu, and Ithamar"]'::jsonb, 0, 'Daniel 1:7', 'Prophecy', 'OT', 'youth'),
  ('How many men did King Nebuchadnezzar see walking unhurt in the blazing fiery furnace?', '["3", "4, and the form of the fourth was like the Son of God", "7", "12"]'::jsonb, 1, 'Daniel 3:25', 'Prophecy', 'OT', 'kids'),
  ('Into what perilous den of beasts was the aged prophet Daniel thrown for refusing to cease praying to God three times a day?', '["Vipers'' nest", "Lions'' den", "Scorpions'' pit", "Wolves'' lair"]'::jsonb, 1, 'Daniel 6:16', 'Prophecy', 'OT', 'kids'),
  ('How many days and nights was Jonah in the belly of the great sea creature?', '["1 day", "3 days and 3 nights", "7 days", "40 days"]'::jsonb, 1, 'Jonah 1:17', 'Prophecy', 'OT', 'kids'),
  ('Which prophet prophesied that the Messiah and eternal Ruler would be born in Bethlehem Ephrathah?', '["Micah", "Malachi", "Habakkuk", "Joel"]'::jsonb, 0, 'Micah 5:2', 'Prophecy', 'OT', 'youth'),
  ('What is the very final book of the Old Testament canon?', '["Zechariah", "Malachi", "Nehemiah", "Song of Solomon"]'::jsonb, 1, 'Malachi 4', 'Prophecy', 'OT', 'kids'),

  -- --- THE GOSPELS (Matthew, Mark, Luke, John) ---
  ('In which city of David was Jesus Christ born in a humble manger?', '["Nazareth", "Jerusalem", "Bethlehem", "Capernaum"]'::jsonb, 2, 'Luke 2:4-7', 'Gospel', 'NT', 'kids'),
  ('What three gifts did the eastern Magi present to young Jesus?', '["Silver, copper, and bronze", "Gold, frankincense, and myrrh", "Bread, wine, and olive oil", "Purple cloth, pearls, and wheat"]'::jsonb, 1, 'Matthew 2:11', 'Gospel', 'NT', 'kids'),
  ('Who baptized Jesus in the Jordan River and declared: "Behold, the Lamb of God who takes away the sin of the world!"?', '["John the Baptist", "Peter", "Nicodemus", "Joseph of Arimathea"]'::jsonb, 0, 'John 1:29', 'Gospel', 'NT', 'kids'),
  ('For how many days and nights did Jesus fast in the Judean wilderness while being tempted by the devil?', '["7", "12", "40", "70"]'::jsonb, 2, 'Matthew 4:2', 'Gospel', 'NT', 'kids'),
  ('On what prominent geographical feature did Jesus preach the Beatitudes recorded in Matthew 5-7?', '["From a boat on Lake Galilee", "On the Mount of Olives", "On a mountainside (The Sermon on the Mount)", "In Solomon''s Colonnade"]'::jsonb, 2, 'Matthew 5:1', 'Gospel', 'NT', 'kids'),
  ('What was Jesus'' first recorded miracle in the Gospel of John?', '["Walking on water", "Turning water into choice wine at the wedding in Cana", "Healing blind Bartimaeus", "Feeding the 5,000"]'::jsonb, 1, 'John 2:1-11', 'Gospel', 'NT', 'kids'),
  ('Which pharisee and member of the Jewish Sanhedrin came to Jesus by night to inquire about eternal life?', '["Gamaliel", "Caiaphas", "Nicodemus", "Ananias"]'::jsonb, 2, 'John 3:1-2', 'Gospel', 'NT', 'teens'),
  ('Recite John 3:16: "For God so loved the world that He gave His one and only Son, that _______."', '["all religions might unite", "whoever believes in Him shall not perish but have eternal life", "the nations would cease all conflicts", "men would follow the commandments"]'::jsonb, 1, 'John 3:16', 'Gospel', 'NT', 'kids'),
  ('At Jacob''s well in Samaria, what did Jesus offer to the Samaritan woman?', '["Coins of gold", "Living water springing up to eternal life", "Bread from heaven", "A scroll of the prophets"]'::jsonb, 1, 'John 4:14', 'Gospel', 'NT', 'teens'),
  ('Who stepped out of the boat into stormy waves and walked on water toward Jesus before sinking in doubt?', '["John", "Peter", "Andrew", "Thomas"]'::jsonb, 1, 'Matthew 14:29', 'Gospel', 'NT', 'kids'),
  ('How many men (besides women and children) did Jesus feed with five barley loaves and two small fish?', '["500", "2,000", "5,000", "12,000"]'::jsonb, 2, 'Matthew 14:21', 'Gospel', 'NT', 'kids'),
  ('In the parable of the Good Samaritan, who stopped to bandage the beaten traveler''s wounds after priests passed by?', '["A Roman soldier", "A Samaritan", "A Levite", "A Jewish scribe"]'::jsonb, 1, 'Luke 10:33', 'Gospel', 'NT', 'kids'),
  ('Which short tax collector climbed a sycamore-fig tree in Jericho to see Jesus passing by?', '["Levi", "Zacchaeus", "Matthew", "Theophilus"]'::jsonb, 1, 'Luke 19:4', 'Gospel', 'NT', 'kids'),
  ('How many days had Lazarus of Bethany been deceased in the tomb before Jesus commanded him to come forth?', '["1 day", "2 days", "4 days", "7 days"]'::jsonb, 2, 'John 11:17', 'Gospel', 'NT', 'teens'),
  ('What animal did Jesus ride into Jerusalem on Palm Sunday during His triumphal entry?', '["A white stallion", "A donkey''s colt", "A royal camel", "A golden chariot"]'::jsonb, 1, 'Matthew 21:5', 'Gospel', 'NT', 'kids'),
  ('For how many pieces of silver did Judas Iscariot betray the Lord Jesus?', '["10", "30", "50", "100"]'::jsonb, 1, 'Matthew 26:15', 'Gospel', 'NT', 'kids'),
  ('In which garden did Jesus agonizingly pray: "My Father, if it is possible, may this cup be taken from Me. Yet not as I will, but as You will"?', '["Garden of Eden", "Garden of Gethsemane", "Garden of Siloam", "Garden of Bethany"]'::jsonb, 1, 'Matthew 26:36-39', 'Gospel', 'NT', 'teens'),
  ('How many times did Apostle Peter deny knowing Jesus before the rooster crowed twice?', '["Once", "Twice", "Three times", "Seven times"]'::jsonb, 2, 'Luke 22:61', 'Gospel', 'NT', 'kids'),
  ('Which Roman governor sentenced Jesus to crucifixion after publicly washing his hands?', '["Herod the Great", "Pontius Pilate", "Felix", "Festus"]'::jsonb, 1, 'Matthew 27:24', 'Gospel', 'NT', 'teens'),
  ('What title in Hebrew, Latin, and Greek was nailed above Jesus'' head on the cross at Golgotha?', '["The Prophet of Galilee", "Jesus of Nazareth, King of the Jews (INRI)", "Son of David", "Master of All"]'::jsonb, 1, 'John 19:19-20', 'Gospel', 'NT', 'teens'),
  ('Who boldly requested the body of Jesus from Pilate and placed Him in his own newly carved rock tomb?', '["Nicodemus", "Joseph of Arimathea", "Simon of Cyrene", "Lazarus"]'::jsonb, 1, 'Matthew 27:57-60', 'Gospel', 'NT', 'youth'),
  ('On what day following His crucifixion did Jesus triumphantly resurrect from the dead?', '["On the second day", "On the third day (Sunday morning)", "On the seventh day", "After forty days"]'::jsonb, 1, '1 Corinthians 15:4', 'Gospel', 'NT', 'kids'),
  ('Which disciple doubted Jesus'' resurrection until he personally saw and touched the nail marks in His hands?', '["Philip", "Thomas", "Bartholomew", "James"]'::jsonb, 1, 'John 20:25-27', 'Gospel', 'NT', 'kids'),

  -- --- ACTS & THE EARLY CHURCH ---
  ('On which Jewish festival did the Holy Spirit descend upon the 120 disciples in the Upper Room with tongues of fire?', '["Passover", "Day of Atonement", "Day of Pentecost", "Feast of Tabernacles"]'::jsonb, 2, 'Acts 2:1-4', 'History', 'NT', 'kids'),
  ('How many souls were convicted and baptized after Peter preached the Gospel at Pentecost?', '["About 120", "About 500", "About 3,000", "Over 10,000"]'::jsonb, 2, 'Acts 2:41', 'History', 'NT', 'teens'),
  ('Who was the first Christian martyr, stoned to death while crying: "Lord, do not hold this sin against them"?', '["James", "Stephen", "Philip", "Barnabas"]'::jsonb, 1, 'Acts 7:59-60', 'History', 'NT', 'teens'),
  ('On the road to which city was Saul blinded by a blazing light from heaven when Jesus spoke to him?', '["Antioch", "Damascus", "Rome", "Alexandria"]'::jsonb, 1, 'Acts 9:3', 'History', 'NT', 'kids'),
  ('Which early believer and disciple was known as the "Son of Encouragement" who sold land to support the church and championed Paul?', '["Silas", "Barnabas", "Timothy", "Apollos"]'::jsonb, 1, 'Acts 4:36', 'History', 'NT', 'teens'),
  ('In which city were disciples of Jesus first called "Christians"?', '["Jerusalem", "Antioch of Syria", "Corinth", "Ephesus"]'::jsonb, 1, 'Acts 11:26', 'History', 'NT', 'teens'),
  ('While Paul and Silas were singing hymns in a Philippian prison at midnight, what happened?', '["An earthquake shook the prison and the chains fell off", "An angel struck down the guards", "A fiery chariot arrived", "The magistrate brought a pardon"]'::jsonb, 0, 'Acts 16:25-26', 'History', 'NT', 'kids'),
  ('To which group of Greek philosophers did Paul preach at the Areopagus (Mars Hill) in Athens regarding the "Unknown God"?', '["Epicureans and Stoics", "Platonists and Pythagoreans", "Cynics and Sophists", "Spartans and Corinthians"]'::jsonb, 0, 'Acts 17:18-23', 'History', 'NT', 'youth'),
  ('On which Mediterranean island was Paul shipwrecked while being transported in chains to Rome?', '["Crete", "Cyprus", "Malta", "Patmos"]'::jsonb, 2, 'Acts 28:1', 'History', 'NT', 'youth'),

  -- --- EPISTLES & REVELATION ---
  ('What is the overarching theme of Paul''s Epistle to the Romans?', '["The priesthood of Aaron", "The righteousness of God received through faith in Jesus Christ", "Instructions for temple building", "The reign of King Solomon"]'::jsonb, 1, 'Romans 1:16-17', 'Pauline', 'NT', 'youth'),
  ('Romans 8:28 promises that: "In all things God works for the good of those who _______."', '["live lives of ascetic poverty", "love Him and are called according to His purpose", "keep the Sabbath rigorously", "seek political offices"]'::jsonb, 1, 'Romans 8:28', 'Pauline', 'NT', 'kids'),
  ('Which chapter of 1 Corinthians is celebrated as the "Love Chapter"?', '["Chapter 1", "Chapter 11", "Chapter 13", "Chapter 15"]'::jsonb, 2, '1 Corinthians 13', 'Pauline', 'NT', 'kids'),
  ('Complete Galatians 5:22: "The fruit of the Spirit is _______."', '["fear, trembling, sorrow, grief", "love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control", "wealth, fame, dominion, pride", "knowledge, doctrine, philosophy"]'::jsonb, 1, 'Galatians 5:22-23', 'Pauline', 'NT', 'kids'),
  ('According to Ephesians 2:8-9, believers are saved by grace through what?', '["Through good works and ritual washings", "Through faith—and this not from yourselves, it is the gift of God", "Through ancestral heritage", "Through knowledge of Greek philosophy"]'::jsonb, 1, 'Ephesians 2:8-9', 'Pauline', 'NT', 'kids'),
  ('Recite Philippians 4:13: "I can do all things through _______ who strengthens me."', '["my own willpower", "Christ", "positive thinking", "faithful ancestors"]'::jsonb, 1, 'Philippians 4:13', 'Pauline', 'NT', 'kids'),
  ('In 1 Thessalonians 5:16-18, believers are commanded to: "Rejoice always, pray without ceasing, and _______."', '["complain when trials come", "give thanks in all circumstances, for this is God''s will for you in Christ Jesus", "store up treasures on earth", "judge unbelievers"]'::jsonb, 1, '1 Thessalonians 5:16-18', 'Pauline', 'NT', 'teens'),
  ('Who was the young pastoral protege to whom Paul wrote: "Don''t let anyone look down on you because you are young, but set an example for the believers"?', '["Titus", "Timothy", "Philemon", "Luke"]'::jsonb, 1, '1 Timothy 4:12', 'Pauline', 'NT', 'teens'),
  ('Hebrews 11:1 defines faith as: "Now faith is confidence in what we hope for and _______."', '["a mystical trance", "assurance about what we do not see", "a blind leap into darkness", "intellectual assent without action"]'::jsonb, 1, 'Hebrews 11:1', 'General', 'NT', 'teens'),
  ('Which Epistle warns that "faith by itself, if it is not accompanied by action, is dead"?', '["Epistle of James", "1 John", "2 Peter", "Jude"]'::jsonb, 0, 'James 2:17', 'General', 'NT', 'teens'),
  ('On which rocky Aegean island was the Apostle John exiled when he received the heavenly visions of Revelation?', '["Rhodes", "Patmos", "Crete", "Corfu"]'::jsonb, 1, 'Revelation 1:9', 'Prophecy', 'NT', 'teens'),
  ('What is the title of the triumphant climactic song of the heavenly hosts in Revelation 19:6?', '["Hallelujah! For the Lord our God the Almighty reigns!", "The Song of Moses", "Glory to the kings of earth", "Peace upon Babylon"]'::jsonb, 0, 'Revelation 19:6', 'Prophecy', 'NT', 'teens'),
  ('What is the very final prayer and blessing recorded in Revelation 22:20-21?', '["Amen. Come, Lord Jesus. The grace of the Lord Jesus be with God''s people. Amen.", "Behold, the earth will be burned", "Farewell until the end of centuries", "Remember the law of Moses"]'::jsonb, 0, 'Revelation 22:20-21', 'Prophecy', 'NT', 'kids');

  -- 4. SEED SAMPLE PLAYER PROGRESS & SCORES IF USER EXISTS
  IF v_first_user IS NOT NULL THEN
    INSERT INTO public.arcade_progress (user_id, game_slug, level, best_score, plays, last_played_on, streak)
    VALUES
      (v_first_user, 'trivia', 3, 850, 6, CURRENT_DATE, 3),
      (v_first_user, 'david', 2, 500, 4, CURRENT_DATE, 2),
      (v_first_user, 'ark', 1, 350, 2, CURRENT_DATE - 1, 1),
      (v_first_user, 'scramble', 2, 600, 5, CURRENT_DATE, 3)
    ON CONFLICT (user_id, game_slug) DO UPDATE SET
      best_score = EXCLUDED.best_score,
      plays = EXCLUDED.plays,
      streak = EXCLUDED.streak;

    -- Seed achievements
    INSERT INTO public.arcade_achievements (user_id, code, earned_at)
    VALUES
      (v_first_user, 'first_win', now() - INTERVAL '3 days'),
      (v_first_user, 'score_500', now() - INTERVAL '2 days'),
      (v_first_user, 'streak_3', now() - INTERVAL '1 day')
    ON CONFLICT (user_id, code) DO NOTHING;

    -- Seed sample scores
    INSERT INTO public.arcade_scores (game_slug, user_id, score, meta, duration_ms, created_at)
    VALUES
      ('trivia', v_first_user, 850, '{"correct": 8, "total": 10}'::jsonb, 42000, now() - INTERVAL '2 hours'),
      ('david', v_first_user, 500, '{"goliath_down": true, "stones_used": 2}'::jsonb, 15000, now() - INTERVAL '5 hours'),
      ('scramble', v_first_user, 600, '{"verses_completed": 3}'::jsonb, 35000, now() - INTERVAL '1 day')
    ON CONFLICT DO NOTHING;
  END IF;

END $$;
