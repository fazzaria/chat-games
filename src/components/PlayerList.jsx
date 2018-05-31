import React, { Component } from 'react';

class PlayerList extends Component {
  render() {
    var totalReady = 0;
    var totalVoted = 0;
    var compressedPlayerMessage = '';
    for (var i = 0; i < this.props.players.length; i++) {
      if (this.props.players[i].voted) totalVoted++;
      if (this.props.players[i].ready) totalReady++;
    }
    if (this.props.roomState === 0) {
      compressedPlayerMessage = `${totalReady} / ${this.props.players.length} participants ready.`;
    }
    if (this.props.roomState === 1) {
      compressedPlayerMessage = `Waiting for question.`;
    }
    if (this.props.roomState > 1) {
      compressedPlayerMessage = `${totalVoted} / ${this.props.players.length} participants voted.`;
    }
    return (<span>{compressedPlayerMessage}</span>);

    /*if (this.props.players.length < 15) {
      return (
        <div>
          <span className='mr-1'>Participants:</span> 
          {this.props.players
            .sort((player) => this.props.roomState === 0 ? !player.ready : !player.voted)
            .map((player, key)=> {
              var cssClass = 'check-circle';
                if (this.props.roomState === 0 && !player.ready) cssClass = 'circle';
                if (this.props.roomState === 1) return null;
                if (this.props.roomState > 1 && !player.voted) cssClass = 'circle';
                return (
                  <i key={key} className={`fas fa-${cssClass}`} aria-hidden='true'></i>
                );
            })}
        </div>
      );
    } else if (this.props.roomState !== 1) {
      return (
        <span className='float-left'><i className={`fas fa-circle`}></i> {compressedPlayerMessage}</span>
      );
    } else return null;*/
  }
}

export default PlayerList;