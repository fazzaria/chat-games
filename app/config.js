var gameTypes = {
	SWF: 'SWF',
	OWS: 'OWS'
};

var gameOptions = {};

gameOptions[gameTypes.SWF] = {
	acceptWord: 'GOODBYE',
	allowSockPuppets: true,
	getLunarPhase: false,
	maxChatMsgLength: 300,
	maxRooms: 4500,
	minPlayers: 0,
	roomStates: {
		WAITING: 0,
		ASKING: 1,
		ANSWERING: 2,
		TIEBREAK: 3
	},
};

gameOptions[gameTypes.OWS] = {
	allowSockPuppets: true,
	maxChatMsgLength: 300,
	maxRooms: 4500,
	minPlayers: 0,
	roomStates: {
		WAITING: 0,
		WRITING: 1
	}
};

module.exports = { gameTypes, gameOptions };