import React, { Component } from 'react';
import { Redirect, withRouter } from "react-router-dom";
import RoomMessages from './RoomMessages.jsx';
import Controls from './Controls.jsx';
import games from '../data/games';

class GameRoom extends Component {
  constructor(props) {
    super(props);
    this.state = {
    };
    this.redirect = this.redirect.bind(this);
  }
  componentDidMount() {
    this.props.socket.emit('gameHome', this.props.gameType);
    this.props.socket.on('publicRooms', (data) => this.setState(data));
    this.props.socket.on('joinedGame', (roomCode) => {
      this.redirect(`${this.props.match.url}/${roomCode}`);
    });
  }

  joinRoom(roomCode) {
    if (!roomCode) {
      this.setAlert('Please enter a name.', 'warning', true);
      return;
    }
    this.props.socket.emit('joinRoom', this.props.gameType, roomCode);
  }

  render() {
    const gameData = games[this.props.gameType];
    return (
      <div>
        game test
      </div>
    );
  }
}

export default withRouter(GameRoom);