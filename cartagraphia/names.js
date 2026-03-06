// names.js

const kingdomPrefixes = [
    // Original
    "Aethel", "Val", "Dor", "Gon", "Ro", "West", "Nar", "Mor", "Eria", "Riven", 
    "Ar", "Shir", "Frey", "Oak", "Silver", "High", "Iron", "Storm", "Orgrim", 
    "Darnas", "Thunder", "Under", "Lord", "Gil", "Kul", "Dala", "Strom", "Alte", 
    "Khaz", "Quel", "Glim", "Bale", "Karak", "Zul", "Amani", "Gura", "Fara", 
    "Cen", "Thera", "Vene", "Dawn", "Dusk", "Night", "Day", "Sun", "Star", 
    "Moon", "Sky", "Sea", "Land",
    
    // Elemental & Nature
    "Ash", "Ember", "Frost", "Snow", "Ice", "Wind", "Rain", "Cloud", "Stone",
    "Rock", "Gold", "Bronze", "Copper", "Steel", "Wood", "Pine", "Elm",
    "Thorn", "Briar", "Rose", "Leaf", "Root", "Spring", "Summer", "Autumn",
    "Winter", "Twilight", "Shadow", "Gloom", "Light", "Dark", "Fire", "Water",
    "Earth", "Air", "Gale", "Mist", "Fog", "Crag", "Cliff", "Ridge", "Peak",
    
    // Creature & Mythic
    "Dragon", "Wyrm", "Drake", "Wolf", "Bear", "Lion", "Stag", "Eagle", "Hawk",
    "Falcon", "Raven", "Crow", "Owl", "Swan", "Fox", "Hound", "Snake", "Viper",
    "Serpent", "Griffon", "Phoenix", "Troll", "Orc", "Elf", "Dwarf", "Fae",
    
    // High Fantasy & Elvish
    "Sil", "Gal", "Celeb", "El", "Min", "Tir", "Ith", "Loth", "Nim", "Orod",
    "Pel", "Rhun", "Thar", "Um", "Yar", "Zan", "Aeg", "Aer", "Aeth", "Am",
    "An", "Aon", "Aur", "Bael", "Bair", "Bhal", "Brae", "Cael", "Caer", "Cai",
    "Cal", "Cen", "Cor", "Cyr", "Dae", "Dael", "Dan", "Dar", "Del", "Dra",
    
    // Grim & Gothic
    "Bane", "Black", "Blood", "Bone", "Cold", "Dead", "Death", "Dire", "Doom",
    "Dread", "Fell", "Foul", "Grim", "Hard", "Hell", "Hex", "Ill", "Mael",
    "Mal", "Mourn", "Necro", "Nether", "Null", "Obsidian", "Onyx", "Pale",
    "Plague", "Poison", "Rot", "Ruin", "Rust", "Savage", "Skull", "Sorrow",
    "Soul", "Vile", "Void", "Wraith", "Wrath", "Blight", "Bleak", "Cruel",
    
    // Colors & Gems
    "White", "Red", "Blue", "Green", "Yellow", "Grey", "Brown", "Crimson",
    "Azure", "Jade", "Amber", "Ruby", "Sapphire", "Emerald", "Pearl", "Opal",
    "Amethyst", "Topaz", "Quartz", "Garnet", "Beryl", "Coral", "Ivory",
    
    // Action & Status
    "Low", "Far", "Near", "Old", "New", "Free", "True", "Fair", "Grand",
    "Noble", "Royal", "Sacred", "Holy", "Divine", "Fallen", "Lost", "Forgotten",
    "Hidden", "Secret", "Broken", "Shattered", "Burning", "Frozen", "Weeping",
    "Whispering", "Silent", "Blind", "Wild", "Fierce", "Brave", "Bold",
    
    // Syllable Generics
    "Ald", "Bal", "Dal", "Ebon", "Fal", "Gar", "Hal", "Ign", "Jal", "Kal",
    "Lor", "Nyx", "Or", "Pal", "Qor", "Ral", "Sal", "Tal", "Ur", "Vyl",
    "Wyn", "Xyl", "Ynn", "Zor", "Bel", "Cel", "Fel", "Gel", "Il", "Jel",
    "Kel", "Lel", "Mel", "Nel", "Ol", "Quen", "Rel", "Sel", "Tel", "Ul",
    "Vel", "Wel", "Xel", "Yel", "Zel", "Aar", "Aen", "Ail", "Ain", "Al",
    "Aun", "Brim", "Cael", "Dhun", "Eil", "Eir", "Elen", "Eon", "Fael", "Fha"
];

const kingdomSuffixes = [
    // Original
    "gard", "yria", "n", "dor", "han", "eros", "nia", "ell", "nor", "land", 
    "ja", "haven", "moon", "garden", "forge", "wind", "mar", "sus", "bluff", 
    "city", "aeron", "neas", "tiras", "ran", "garde", "rac", "modan", "thalas", 
    "wood", "peak", "zand", "drak", "gath", "moth", "thil", "heim", "gate", 
    "wall", "keep", "hold",
    
    // Geography & Nature
    "ria", "thal", "mount", "hill", "vale", "dale", "glen", "forest", "grove",
    "weald", "marsh", "swamp", "fen", "moor", "bog", "mire", "lake", "sea",
    "ocean", "gulf", "bay", "cove", "fjord", "strait", "sound", "reach", "firth",
    "river", "stream", "brook", "creek", "run", "fall", "falls", "water", "ford",
    "drift", "deep", "shallow", "shoal", "shore", "coast", "strand", "beach",
    "isle", "island", "reef", "rock", "stone", "crag", "cliff", "ridge", "edge",
    "point", "cape", "head", "ness", "peninsula", "basin", "canyon", "chasm",
    
    // Structures & Settlements
    "burg", "burgh", "bury", "ton", "town", "ville", "wick", "wic", "port",
    "dock", "pier", "landing", "crossing", "bridge", "way", "path", "road",
    "street", "track", "trail", "pass", "toll", "watch", "tower", "spire",
    "pillar", "dome", "hall", "fort", "fortress", "castle", "citadel", "bastion",
    "palace", "court", "seat", "throne", "crown", "helm", "shield", "sword",
    "spear", "bow", "arrow", "axe", "mace", "hammer", "anvil", "hearth", "home",
    "house", "stead", "thorp", "thorpe", "hamlet", "village", "camp", "tent",
    "spire", "vault", "crypt", "tomb", "shrine", "temple", "sanctuary",
    
    // Fantasy Linguistic Endings
    "ia", "a", "en", "on", "un", "in", "yn", "ys", "is", "os", "us", "as",
    "er", "ar", "or", "ur", "ir", "yr", "el", "al", "il", "ol", "ul", "yl",
    "em", "am", "im", "om", "um", "ym", "et", "at", "it", "ot", "ut", "yt",
    "eth", "ath", "ith", "oth", "uth", "yth", "ess", "ass", "iss", "oss",
    "uss", "yss", "ique", "esque", "ance", "ence", "ion", "tion", "sion",
    "x", "ex", "ix", "ox", "ux", "yx", "ze", "za", "zi", "zo", "zu", "zy"
];