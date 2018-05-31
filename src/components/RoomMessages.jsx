import React, { Component } from 'react';
import PlayerList from './PlayerList.jsx';

class RoomMessages extends Component {
  render() {
    var lastAnswer, noun, verb = '';
    if (this.props.roomState === 0 && this.props.question) lastAnswer = `The spirits were asked '${this.props.question}' ${this.props.answer ? "and replied '" + this.props.answer + "'" : 'but nobody came'}.`;
    noun = this.props.players.length > 1 ? 'participant' : 'participant';
    verb = this.props.players.length === 1 ? 'is' : 'are';
    verb += this.props.roomState < 2 ? ' waiting' : ' invoking the spirits';
    var statusMessage = `${this.props.players.length} ${noun} ${verb} here.`
    return (
      <div>
        <div className='messageScroller' ref={this.props.messageScrollerRef}>
          <ul className='list-group'>
            {this.props.roomMessages.map((message, key) => {
              var cssClass = 'list-group-item';
              cssClass+= message.cssClass ? ' list-group-item-' + message.cssClass : '';
              return (<li className={cssClass} key={key}>{message.text}</li>);
            })}
          </ul>
          <div ref={this.props.bottomMessageRef}></div>
        </div>
        <ul className='list-group'>
          <li className='list-group-item bottomPanel'>
            <p>You are {this.props.preposition} the <strong>{this.props.formatRoomName(this.props.roomCode)}</strong>. {statusMessage}</p>
            <p><PlayerList players={this.props.players} roomState={this.props.roomState} /></p>
            <p className='breakWord'>{this.props.roomState === 2 ? <strong>{this.props.question} | {this.props.answer}</strong> : lastAnswer}</p>
          </li>
        </ul>
      </div>
    );
  }
}

export default RoomMessages;