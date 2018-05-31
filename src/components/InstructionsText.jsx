import React, { Component } from 'react';

class InstructionsText extends Component {
  render() {
    return(
      <div>
        <h5>How to Play</h5>
        <ol>
          <li>Click 'Start New' to begin a new session, or type an existing session code and click 'Join.' Codes are displayed in <strong>bold</strong> in the room.</li>
          <li>The round begins once all participants have clicked the 'Ready' button.</li>
          <li>One participant will be randomly selected to pose a question. After the question is asked, participants will build the answer letter by letter through successive rounds of voting. Supernatural forces will guide the group consensus.</li>
          <li>Each round, participants may either vote for the next letter by entering it and clicking 'Commmit', or vote to accept the answer given so far by clicking 'Goodbye.' Ties will be broken by runoff voting.</li>
          <li>After an answer is accepted, the game will again wait for all players to click 'Ready' before starting a new round.</li>
        </ol>
      </div>
    );
  }
}

export default InstructionsText;