import React, { Component } from 'react';

class LunarPhaseIcon extends Component {
  render() {
    var phaseCss = '';
    if(!this.props.lunarPhase) {
      phaseCss = 'far fa-moon';
    } else {
      phaseCss = this.props.lunarPhase === 'full' ? 'far fa-circle' : this.props.lunarPhase === 'new' ? 'fas fa-circle' : 'fas fa-adjust';
    }
    return (
      <i className={`${phaseCss} fa-sm`} aria-hidden='true'></i>
    );
  }
}

export default LunarPhaseIcon;