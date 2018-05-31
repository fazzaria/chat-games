import React, { Component } from 'react';

class Controls extends Component {
  render() {
    var voted = false;
    var ready = false;
    for (var i = 0; i < this.props.players.length; i++) {
      if (this.props.players[i].self) {
        voted = this.props.players[i].voted;
        ready = this.props.players[i].ready;
      }
    }
    if (this.props.roomState === 0) {
      return (
        <div>
          <div className='input-group'>
            <input 
              className='form-control form-control-lg' 
              value={this.props.chatInput} 
              onChange={this.props.changeChatInput}
              onKeyUp={(e) => {if (e.which === 13) this.props.postChatMessage(this.props.chatInput)}}
              ref={this.props.chatInputRef}
              placeholder="Chat"
              maxLength='300' 
              type='text'
            />
            <div className='input-group-append'>
              <button className='btn btn-light float-right btn-lg' onClick={()=>this.props.postChatMessage(this.props.chatInput)}>Send</button>
              <button className='btn btn-dark float-right btn-lg' onClick={this.props.toggleReady}>{ready ? 'Un-Ready' : 'Ready'}</button>  
            </div>
          </div>
        </div>
      );
    } else if (this.props.roomState === 1 && this.props.isAsker) {
      return (
        <div className='input-group'>
          <input 
            className='form-control form-control-lg' 
            value={this.props.questionInput}
            onChange={this.props.changeQuestionInput}
            onKeyUp={(e) => {if (e.which === 13) this.props.commitQuestion(this.props.questionInput)}}
            ref={this.props.questionInputRef} 
            placeholder='Ask the spirits a question.'
            type='text' 
          />
          <div className='input-group-append'>
            <button className='btn btn-dark btn-lg' onClick={()=>this.props.commitQuestion(this.props.questionInput)}>Ask</button>
          </div>
        </div>
      );
    } else if (this.props.roomState === 2) {
      return (
        <div className='input-group'>
          <input 
            className='form-control form-control-lg' 
            value={this.props.voteInput} 
            onChange={this.props.changeVoteInput}
            onKeyUp={(e) => {if (e.which === 13) this.props.submitVote(this.props.voteInput)}}
            ref={this.props.voteInputRef}
            placeholder="Enter a letter or click 'Goodbye.'"
            maxLength='1' 
            type='text' 
            disabled={voted}
          />
          <div className='input-group-append'>
            <button className='btn btn-light btn-lg' disabled={voted} onClick={()=>this.props.submitVote(this.props.voteInput)}>Commit</button>
            <button className='btn btn-dark btn-lg' disabled={voted} onClick={()=>this.props.submitVote('GOODBYE')}>Goodbye</button>
          </div>
        </div>
      );
    } else if (this.props.roomState === 3) {
      return (
        <ul className="nav nav-pills nav-fill">
          {this.props.tiebreakCandidates.map((candidate, key) => {
            var cssClass = 'light';
            if (key % 2 === 0) cssClass = 'dark';
            return(
              <li key={key} className="nav-item">
                <button 
                  className={`btn btn-${cssClass} btn-lg btn-block`}
                  disabled={voted}
                  onClick={() => this.props.submitVote(candidate)}
                >{candidate}</button>
              </li>
            );
          })}
        </ul>
      );
    } else return null;
  }
}

export default Controls;