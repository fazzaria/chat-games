import React from 'react';
import ReactDOM from 'react-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import 'bootstrap/dist/js/bootstrap.min.js';
import registerServiceWorker from './registerServiceWorker';

import Main from './components/Main.jsx';
ReactDOM.render(
  <Main />,
  document.getElementById('root') //eslint-disable-line
);

registerServiceWorker();