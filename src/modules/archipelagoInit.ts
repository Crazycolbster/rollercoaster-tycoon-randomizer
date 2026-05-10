//Archipelago Version Number
const archipelago_version = "v0.1.21-beta";

//Lists for Archipelago
interface archipelago_item {
    LocationID: number,//Internal. Starts at 0
    Item: string,//ItemID
    Game: string,//Game item is heading to
    Slot: number,//Slot of receiving player
    ReceivingPlayer: string,
    Flags: number//Flags such as useful or trap
}
interface archipelago_objective {
    Guests: any[],
    ParkValue: any[],
    RollerCoasters: any[],
    RideIncome: any[],
    ShopIncome: any[],
    ParkRating: any[],
    LoanPaidOff: any[],
    Monopoly: any[]
}
interface archipelago_price{
    LocationID: number,
    Price: number,
    Lives: number,
    RidePrereq: any[]//Amount, category, excitement, intensity, nausea, length, total customers
}
interface archipelago_hint{
    ReceivingPlayer: string,
    FindingPlayer: string,
    Location: string,
    Item: string,
    Found: boolean
}

type playerTuple = [string, boolean, string, number, number]; // Well, this used to be a tuple. PlayerName, Have they won, game they're playing, slot, Team
var archipelago_locked_locations: archipelago_item[] = []; // List of 3 objects: Location ID, Item, and Receiving Player
var archipelago_unlocked_locations: archipelago_item[] = [];
var archipelago_location_prices: archipelago_price[] = []; // List of Location ID's and the requirements to unlock them
var archipelago_award_locations: archipelago_item[] = [];
//In general, the objectives go [amount, parameters (optional), complete]

var archipelago_objectives: {Guests: [number, boolean], ParkValue: [number, boolean], RollerCoasters: [number, number, number, number, number, boolean], RideIncome: [number, boolean], ShopIncome: [number, boolean], ParkRating: [number, boolean], LoanPaidOff: [boolean, boolean], Monopoly: [boolean, boolean], UniqueRides: [any[], boolean] } = 
    {Guests: [7500, false], ParkValue: [0, false], RollerCoasters: [0,0,0,0,0,false], RideIncome: [0, false], ShopIncome: [0, false], ParkRating: [0, false], LoanPaidOff: [false, false], Monopoly: [false, false], UniqueRides: [[], false]};

const item_id_to_name: {[game: string]:{[key: number]: any}}  = {["OpenRCT2"]:{2000000: 'Spiral Roller Coaster', 2000001: 'Stand Up Roller Coaster', 2000002: 'Suspended Swinging Coaster', 2000003: 'Inverted Roller Coaster', 2000004: 'Junior Roller Coaster', 2000005: 'Miniature Railway', 2000006: 'Monorail', 2000007: 'Mini Suspended Roller Coaster', 2000008: 'Boat Hire', 2000009: 'Wooden Wild Mouse', 2000010: 'Steeplechase', 2000011: 'Car Ride', 2000012: 'Launched Freefall', 2000013: 'Bobsleigh Coaster', 2000014: 'Observation Tower', 2000015: 'Looping Roller Coaster', 2000016: 'Dinghy Slide', 2000017: 'Mine Train Coaster', 2000018: 'Chairlift', 2000019: 'Corkscrew Roller Coaster', 2000020: 'Maze', 2000021: 'Spiral Slide', 2000022: 'Go Karts', 2000023: 'Log Flume', 2000024: 'River Rapids', 2000025: 'Dodgems', 2000026: 'Swinging Ship', 2000027: 'Swinging Inverter Ship', 2000028: 'Food Stall', 2000029: 'Drink Stall', 2000030: 'Shop', 2000031: 'Merry Go Round', 2000032: 'Information Kiosk', 2000033: 'Toilets', 2000034: 'Ferris Wheel', 2000035: 'Motion Simulator', 2000036: '3d Cinema', 2000037: 'Top Spin', 2000038: 'Space Rings', 2000039: 'Reverse Freefall Coaster', 2000040: 'Lift', 2000041: 'Vertical Drop Roller Coaster', 2000042: 'Cash Machine', 2000043: 'Twist', 2000044: 'Haunted House', 2000045: 'First Aid', 2000046: 'Circus', 2000047: 'Ghost Train', 2000048: 'Twister Roller Coaster', 2000049: 'Wooden Roller Coaster', 2000050: 'Side Friction Roller Coaster', 2000051: 'Steel Wild Mouse', 2000052: 'Multidimension Roller Coaster', 2000053: 'Multidimension Roller Coaster (alt)', 2000054: 'Flying Roller Coaster', 2000055: 'Flying Roller Coaster (alt)', 2000056: 'Virginia Reel', 2000057: 'Splash Boats', 2000058: 'Mini Helicopters', 2000059: 'Lay Down Roller Coaster', 2000060: 'Suspended Monorail', 2000061: 'Lay Down Roller Coaster (alt)', 2000062: 'Reverser Roller Coaster', 2000063: 'Heartline Twister Coaster', 2000064: 'Mini Golf', 2000065: 'Giga Coaster', 2000066: 'Roto Drop', 2000067: 'Flying Saucers', 2000068: 'Crooked House', 2000069: 'Monorail Cycles', 2000070: 'Compact Inverted Coaster', 2000071: 'Water Coaster', 2000072: 'Air Powered Vertical Coaster', 2000073: 'Inverted Hairpin Coaster', 2000074: 'Magic Carpet', 2000075: 'Submarine Ride', 2000076: 'River Rafts', 2000077: 'Enterprise', 2000078: 'Inverted Impulse Coaster', 2000079: 'Mini Roller Coaster', 2000080: 'Mine Ride', 2000081: 'LIM Launched Roller Coaster', 2000082: 'Hypercoaster', 2000083: 'Hypertwister', 2000084: 'Monster Trucks', 2000085: 'Spinning Wild Mouse', 2000086: 'Classic Mini Roller Coaster', 2000087: 'Hybrid Coaster', 2000088: 'Single Rail Roller Coaster', 2000089: 'Alpine Roller Coaster', 2000090: 'Classic Wooden Roller Coaster', 2000091: 'Classic Stand-up Roller Coaster', 2000092: 'LSM Launched Roller Coaster', 2000093: 'Classic Wooden Twister Roller Coaster', 2000094: 'Fruity Ices Stall (RCT1)', 2000095: 'Art Deco Food Stall', 2000096: 'Beef Noodles Stall', 2000097: 'Candy Apple Market Stall', 2000098: 'Candy Apple Stall', 2000099: 'Chicken Nuggets Stall', 2000100: 'Cookie Shop', 2000101: 'Donut Shop', 2000102: 'Fried Chicken Stall', 2000103: 'Fried Rice Noodles Stall', 2000104: 'Fries Stall', 2000105: 'Fruity Ices Stall (RCT2)', 2000106: 'Funnel Cake Shop', 2000107: 'Hot Dog Stall', 2000108: 'Ice Cream Cone Stall', 2000109: 'Meatball Soup Stall', 2000110: "Neptune's Seafood Stall", 2000111: 'Pretzel Stall', 2000112: 'Roast Sausage Stall', 2000113: 'Sea Food Stall', 2000114: 'Sub Sandwich Stall', 2000115: 'Witches Brew Soup', 2000116: 'Wonton Soup Stall', 2000117: 'Fries Shop', 2000118: 'Cotton Candy Stall', 2000119: 'Burger Bar', 2000120: 'Popcorn Stall', 2000121: 'Pizza Stall', 2000122: 'Drinks Stall', 2000123: 'Coffee Shop', 2000124: 'Hot Chocolate Stall', 2000125: 'Iced Tea Stall', 2000126: 'Lemonade Market Stall', 2000127: 'Lemonade Stall', 2000128: 'Moon Juice', 2000129: 'Soybean Milk Stall', 2000130: 'Star Fruit Drink Stall', 2000131: 'Sujeonggwa Stall', 2000132: 'Flower Power T-Shirts', 2000133: 'Hat Stall', 2000134: 'Soft Toy Stall', 2000135: 'Sunglasses Stall', 2000136: 'T-Shirt Stall', 2000137: 'Balloon Stall', 2000138: 'Souvenir Stall', 2000139: 'scenery', 2000140: 'Abstract Theming', 2000141: 'Africa Theming', 2000142: 'Antarctic Theming', 2000143: 'Asia Theming', 2000144: 'Australasian Theming', 2000145: 'Classical/Roman Theming', 2000146: 'Creepy Theming', 2000147: 'Dark Age Theming', 2000148: 'Egyptian Theming', 2000149: 'Europe Theming', 2000150: 'Fences and Walls', 2000151: 'Future Theming', 2000152: 'Gardens', 2000153: 'Giant Candy Theming', 2000154: 'Giant Garden Theming', 2000155: 'Jungle Theming', 2000156: 'Jurassic Theming', 2000157: 'Martian Theming', 2000158: 'Mechanical Theming', 2000159: 'Medieval Theming', 2000160: 'Mine Theming', 2000161: 'Mythological Theming', 2000162: 'North America Theming', 2000163: 'Pagoda Theming', 2000164: 'Panda Theming', 2000165: 'Pirates Theming', 2000166: 'Prehistoric Theming', 2000167: 'Roaring Twenties Theming', 2000168: 'Roaring Twenties Wall Sets', 2000169: "Rock 'n' Roll Theming", 2000170: 'Shrubs and Ornaments', 2000171: 'Signs and Items for Footpaths', 2000172: 'Six Flags Theming', 2000173: 'Snow and Ice Theming', 2000174: 'South America Theming', 2000175: 'Space Theming', 2000176: 'Spooky Theming', 2000177: 'Sports Theming', 2000178: 'Trees', 2000179: 'Urban Theming', 2000180: 'Walls and Roofs', 2000181: 'Water Feature Theming', 2000182: 'Wild West Theming', 2000183: 'Wonderland Theming', 2000184: 'Rainstorm', 2000185: 'Thunderstorm', 2000186: 'Snowstorm', 2000187: 'Blizzard', 2000188: '$10,000', 2000189: '$5,000', 2000190: '$2,500', 2000191: '$1,000', 2000192: '$500', 2000193: '50 Guests', 2000194: '100 Guests', 2000195: '150 Guests', 2000196: '250 Guests', 2000197: 'Beauty Contest', 2000198: 'Land Discount', 2000199: 'Construction Rights Discount', 2000200: 'Easier Guest Generation', 2000201: 'Easier Park Rating', 2000202: 'Allow High Construction', 2000203: 'Allow Landscape Changes', 2000204: 'Allow Marketing Campaigns', 2000205: 'Allow Tree Removal', 2000206: 'Progressive Speed', 2000207: 'Skip', 2000208: 'Bathroom Trap', 2000209: 'Furry Convention Trap', 2000210: 'Spam Trap', 2000211: 'Loan Shark Trap', 2000212: 'Food Poisoning Trap'}}
var full_item_id_to_name:{[game:string]:{[key:number]: any}} = item_id_to_name;

const branch_colors = ["Black", "Green", "Blue", "Yellow", "Gold", "Silver", "Celadon", "Pink"];
const openRCT2_locations: string[] = [];
// White_0 – White_7
for (let i = 0; i < 8; i++) {
    openRCT2_locations.push("White_" + i);
}
for (let i = 0; i < 1000; i++) {
    for (let c = 0; c < branch_colors.length; c++) {
        openRCT2_locations.push(branch_colors[c] + "_" + i);
    }
}
const award_locations = [
    "Most Untidy Park in the Multiverse",
    "Most Tidy Park in the Multiverse",
    "Best Roller Coasters in the Multiverse",
    // "Best Value in the Multiverse",
    "Most Beautiful Park in the Multiverse",
    "Worst Value in the Multiverse",
    "Hypothetical Safest Park in the Multiverse",
    "Best Staff in the Multiverse",
    "Best Food in the Multiverse",
    "Worst Food in the Multiverse",
    "Best Toilets in the Multiverse",
    "Total Disappointment",
    "Best Water Rides in the Multiverse",
    "Best Custom Designed Rides in the Multiverse",
    "Most Dazzling Colors in the Multiverse",
    "Most Confusing Layout in the Multiverse",
    "Best Gentle Rides in the Multiverse"
  ];
  for (let i = 0; i < award_locations.length; i++) {//Finish making the location list
    openRCT2_locations.push(award_locations[i]);
  }
  var openRCT2_locations_map: { [key: number]: string } = {};//Map each location to a Location ID

  for (let i = 0; i < openRCT2_locations.length; i++) {
    openRCT2_locations_map[i+2000000] = openRCT2_locations[i];
  }
  //Compile the list
  var full_location_id_to_name: { [game: string]: { [key: number]: string } } = {
    "OpenRCT2": openRCT2_locations_map
  };
var archipelago_connected_to_game = false;
var archipelago_connected_to_server = false;
var archipelago_init_received = false;
var archipelago_correct_scenario = true;
var archipelago_multiple_requests = true;
var archipelago_games_requested = 0;
var archipelago_skip_enabled = false;
var archipelago_current_game_request = undefined;
var archipelago_repeat_game_request_ready = true;
var archipelago_repeat_game_request_counter = 0;
var archipelago_location_request_sent = false;//Used to keep Archipelago_Update_Location from spamming location scouts

var archipelago_settings: any = {
    deathlink: false,
    deathlink_timeout: false,
    location_information: "None",
    colorblind_mode: false,
    park_message_chat: true,
    network_chat: true,
    universal_item_messages: false,
    hint_not_found_filter: false,
    hint_player_filter: "",
    rule_locations: [],
    land_price: 2010,
    max_land_checks: 20,
    current_land_checks: 0,
    rights_price: 2010,
    max_rights_checks: 20,
    current_rights_checks: 0,
    current_time: 0,
    monopoly_complete: false,
    monopoly_x: 1,
    monopoly_y: 1,
    fireworks: false,
    awards: 2,//0:all, 1: positive, 2:none
    exclude_safest_park: false,
    awards_received: [],
    multiworld_games: [],
    received_games: ["OpenRCT2"],
    received_items: [],
    index: 0,
    hints: [],
    skips: 1,
    player: undefined,
    team: undefined,
    tags: [],
    preferred_intensity: 1,
    maximum_speed: 1,
    all_rides_and_scenery_base: false,
    all_rides_and_scenery_expansion: false,
    seed: undefined,
    started: false
};

function ArchipelagoSaveLocations(LockedLocations, UnlockedLocations) {
    try {
        context.setTimeout(() => {archipelago_send_message("LocationChecks", UnlockedLocations)}, 1500);
        context.getParkStorage().set('RCTRando.ArchipelagoLockedLocations', LockedLocations);
        context.getParkStorage().set('RCTRando.ArchipelagoUnlockedLocations', UnlockedLocations);
        trace("Location lists updated!");
    } catch(e) {
        printException('error in ArchipelagoSaveLocations: ', e);
    }
}
