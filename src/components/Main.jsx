import React, { Component } from 'react';
import io from 'socket.io-client';
import HomePage from './HomePage.jsx';
import RoomMessages from './RoomMessages.jsx';
import Controls from './Controls.jsx';

let socket;

const gameType = 'SWF';

class Main extends Component {
  constructor(props) {
    super(props);
    this.state = {
      answer: '',
      chatInput: '',
      confirmExitRoom: '',
      feedbackMsg: '',
      feedbackType: '',
      isAsker: false,
      lunarPhase: '',
      players: [],
      preposition: '',
      publicRooms: {},
      question: '',
      questionInput: '',
      roomCode: '',
      roomMessages: [],
      roomState: 0,
      showIsPublic: false,
      tiebreakCandidates: [],
      voteInput: '',
      votes: []
    };

    this.bottomMessageRef = React.createRef();
    this.chatInputRef = React.createRef();
    this.codeInputRef = React.createRef();
    this.messageScrollerRef = React.createRef();
    this.voteInputRef = React.createRef();
    this.questionInputRef = React.createRef();

    this.cancelCreateRoom = this.cancelCreateRoom.bind(this);
    this.changeChatInput = this.changeChatInput.bind(this);
    this.changeQuestionInput = this.changeQuestionInput.bind(this);
    this.changeVoteInput = this.changeVoteInput.bind(this);
    this.clearAlert = this.clearAlert.bind(this);
    this.submitQuestion = this.submitQuestion.bind(this);
    this.createRoom = this.createRoom.bind(this);
    this.exitRoom = this.exitRoom.bind(this);
    this.formatRoomName = this.formatRoomName.bind(this);
    this.handleEnterKey = this.handleEnterKey.bind(this);
    this.joinRoom = this.joinRoom.bind(this);
    this.postChatMessage = this.postChatMessage.bind(this);
    this.submitVote = this.submitVote.bind(this);
  }

  componentDidMount() {
    //socket = io.connect(window.location.origin);
    socket = io.connect('localhost:8080');

    socket.on('error', (err) => {
      if (this.state.roomCode) {
        this.addRoomMessage({text: err.message, cssClass: 'danger'});
      } else {
        this.setAlert(err.message, 'danger');
      }
    });

    socket.on('warning', (msg) => {
      if (this.state.roomCode) {
        this.addRoomMessage({text: msg, cssClass: 'warning'});
      } else {
        this.setAlert(msg, 'warning');
      }
    });

    socket.on('roomData', (stateObj) => {
      if (stateObj.players) {
        if (this.state.players.length !== stateObj.players.length && this.state.players.length > 0) {
          var message = this.state.players.length > stateObj.players.length ? 'A participant has left.' : 'A new participant has joined.';
          this.addRoomMessage({ text: `${message}`, cssClass: 'dark' });
        }
      }
      this.setState(stateObj);
    });

    socket.on('joinedRoom', (code) => {
      this.setState({
        isAsker: this.isAsker(),
        roomCode: code 
      });
      this.clearAlert();
    });

    socket.on('createdRoom', (code) => {
      this.setState({ 
        isAsker: false,
        roomCode: code,
        showIsPublic: false
      });
      this.addRoomMessage({ text: 'New game started. Waiting for players...', cssClass: 'dark' });
    });

    socket.on('askerSelected', () => {
      var isAsker = this.isAsker();
      this.setState({
        isAsker: isAsker
      }, () => {
        var message = '';
        if (isAsker) {
          message = 'You have been chosen to pose the question.';
          this.focusInputs();
        } else {
          message = 'The questioner has been chosen.';
        }
        this.addRoomMessage({ text: message, cssClass: 'dark' });  
      });
    });

    socket.on('questionAccepted', (question) => {
      console.log(question);
      this.setState({
        isAsker: false
      });
      this.clearInputs();
      this.focusInputs();
      this.addRoomMessage({ text: `The question has been asked: ${this.state.question}`, cssClass: 'dark' });
    });

    socket.on('voteAccepted', (vote) => {
      this.clearInputs();
      this.addRoomMessage({ text: `You voted: ${vote}` });
    });

    socket.on('drawReached', () => {
      this.addRoomMessage({ text: `A draw has been reached between ${this.state.tiebreakCandidates.join(', ')}. | Votes: ${this.state.votes.join(', ')}` });
    });

    socket.on('letterDecided', (letter) => {
      this.focusInputs();
      this.addRoomMessage({ text: `${letter} selected. | Votes: ${this.state.votes.join(', ')}` });
    });

    socket.on('answerDecided', () => {
      var message = '';
      if (this.state.answer) {
        message = `The spirits answered: ${this.state.answer} | Votes: ${this.state.votes.join(', ')}`;
      } else message =  `No answer was given. | Votes: ${this.state.votes.join(', ')}`;
      this.addRoomMessage({ text: message, cssClass: 'dark' });
      this.addRoomMessage({ text: 'Waiting for participants...', cssClass: 'dark' });
    });

    socket.on('yourMessagePosted', () => {
      this.setState({
        chatInput: ''
      });
      this.focusInputs();
    });

    socket.on('newChatMessage', (msg) => {
      this.addRoomMessage({text: msg});
    });

    socket.on('exitedRoom', () => {
      clearTimeout(this.state.confirmExitRoom);
      this.setState({
        isAsker: false,
        confirmExitRoom: false,
        roomCode: '',
        roomMessages: []
      });
    });

    socket.on('lunarPhase', (phase) => { 
      this.setState({
        lunarPhase: phase
      });
    });

    this.focusInputs();
  }

  isAsker() {
    var isAsker = false;
    for (var i = 0; i < this.state.players.length; i++) {
      if (this.state.players[i].self) {
        isAsker = this.state.players[i].isAsker
      }
    }
    return isAsker;
  }

  addRoomMessage(msg) {
    var roomMessages = this.state.roomMessages;
    if (roomMessages.length >= 20) roomMessages.shift();
    this.setState({
      roomMessages: roomMessages
    }, () => {
      roomMessages.push(msg);
      var scroller = this.messageScrollerRef.current;

      //get combined height of last 2 messages
      var offset = 0;
      if (scroller.children[0].children.length > 2) offset = scroller.children[0].children[scroller.children[0].children.length - 1].clientHeight + scroller.children[0].children[scroller.children[0].children.length - 2].clientHeight;
      var scroll = Math.ceil(scroller.scrollHeight - scroller.scrollTop) <= (scroller.clientHeight + offset);

      this.setState({roomMessages: roomMessages}, () => {
        if (this.bottomMessageRef.current && this.messageScrollerRef.current) {
          if (scroll) this.bottomMessageRef.current.scrollIntoView({behavior: 'smooth'});
        }
      });
    })
  }

  createRoom(isPublic) {
    if (!this.state.showIsPublic) {
      this.setState({
        showIsPublic: true
      });
    } else {
      socket.emit('createRoom', gameType, { isPublic });
    }
  }

  joinRoom(roomCode) {
    if (!roomCode) {
      this.setAlert('Please enter a name.', 'warning', true);
      return;
    }
    socket.emit('joinRoom', gameType, roomCode);
  }

  exitRoom() {
    if (!this.state.confirmExitRoom) {
      this.setState({
        confirmExitRoom: setTimeout(() => {this.setState({confirmExitRoom: false})}, 5000)
      });
    } else {
      socket.emit('exitRoom');  
    }
  }

  clearInputs() {
    this.setState({
      voteInput: '',
      questionInput: ''
    });
  }

  focusInputs() {
    if (this.chatInputRef.current) this.chatInputRef.current.focus();
    if (this.codeInputRef.current) this.codeInputRef.current.focus();
    if (this.questionInputRef.current) this.questionInputRef.current.focus();
    if (this.voteInputRef.current) this.voteInputRef.current.focus();
  }

  handleEnterKey(fn) {
    fn();
  }

  toggleReady() {
    socket.emit('toggleReady');
  }

  submitQuestion(question) {
    if (question) {
      socket.emit('submitQuestion', this.state.questionInput);
    } else {
      this.addRoomMessage({text: 'Please enter a question.', cssClass: 'warning'}, true);
      this.focusInputs();
    }
  }

  changeChatInput(e) {
    this.setState({ chatInput: e.target.value });
  }

  changeVoteInput(e) {
    this.setState({ voteInput: e.target.value.toUpperCase() });
  }

  changeQuestionInput(e) {
    this.setState({ questionInput: e.target.value });
  }

  submitVote(vote) {
    if (vote) {
      socket.emit('submitVote', vote);
    } else {
      this.addRoomMessage({text: 'Please enter a character.', cssClass: 'warning'}, true);
      this.focusInputs();
    }
  }

  postChatMessage(msg) {
    if (msg) {
      socket.emit('postChatMessage', msg);
    }
  }

  clearAlert() {
    this.setState({ feedbackMsg: '', feedbackType: '' });
  }

  setAlert(msg, level, temp) {
    this.setState({ feedbackMsg: msg, feedbackType: level });
    if (temp) setTimeout(this.clearAlert, 2000);
  }

  cancelCreateRoom() {
    this.setState({
      showIsPublic: false
    });
  }

  formatRoomName(name) {
    var words = name.split('-');
    for (var i = 0; i < words.length; i++) {
      //make words title case
      if (words[i] !== 'of') words[i] = words[i].replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }
    return words.join(' ');
  }

  render() {
    return (
      <div>
        <div className='container'>
          {this.state.feedbackMsg ?
            <div className='row'>
              <div className='col'>
                <div className={'alert alert-' + this.state.feedbackType + ' alert-dismissible fade show'} role='alert'>
                  <strong>{this.state.feedbackMsg}</strong>
                  <button type='button' className='close' onClick={this.clearAlert} aria-label='Close'>
                    <span aria-hidden='true'>&times;</span>
                  </button>
                </div> 
              </div>
            </div>
          : null}
          {!this.state.roomCode ? 
            <HomePage 
              cancelCreateRoom={this.cancelCreateRoom}
              lunarPhase={this.state.lunarPhase}
              codeInputRef={this.codeInputRef}
              publicRooms={this.state.publicRooms}
              joinRoom={this.joinRoom}
              formatRoomName={this.formatRoomName}
              createRoom={this.createRoom}
              showIsPublic={this.state.showIsPublic}
            />
          :
            <div>
              <div className='row'>
                <div className='col'>
                  <button type='button' className='btn btn-light btn-block btn-lg' onClick={this.exitRoom}>{this.state.confirmExitRoom ? 'Click again to confirm.' : 'Exit'}</button>
                </div>
              </div>
              <div className='row'>
                <div className='col'>
                  <RoomMessages
                    answer={this.state.answer}
                    bottomMessageRef={this.bottomMessageRef}
                    formatRoomName={this.formatRoomName}
                    messageScrollerRef={this.messageScrollerRef}
                    roomMessages={this.state.roomMessages}
                    roomState={this.state.roomState}
                    preposition={this.state.preposition}
                    roomCode={this.state.roomCode}
                    players={this.state.players}
                    question={this.state.question}
                  />
                </div>
              </div>
              <div className='row'>
                <div className='col'>
                  <Controls 
                    changeChatInput={this.changeChatInput}
                    changeQuestionInput={this.changeQuestionInput}
                    changeVoteInput={this.changeVoteInput}
                    chatInput={this.state.chatInput}
                    chatInputRef={this.chatInputRef}
                    submitQuestion={this.submitQuestion}
                    handleEnterKey={this.handleEnterKey}
                    isAsker={this.state.isAsker}
                    postChatMessage={this.postChatMessage}
                    questionInput={this.state.questionInput}
                    questionInputRef={this.questionInputRef}
                    roomState={this.state.roomState}
                    players={this.state.players}
                    submitVote={this.submitVote}
                    tiebreakCandidates={this.state.tiebreakCandidates}
                    toggleReady={this.toggleReady}
                    voteInput={this.state.voteInput}
                    voteInputRef={this.voteInputRef}
                  />
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    );
  }
}

export default Main;
