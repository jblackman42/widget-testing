class MinistryQuestionGraph extends HTMLElement {
  constructor() {
    super();

    
    this.ministryQuestionID = this.getAttribute('ministry-question-id');
    this.monthly = this.getAttribute('scale') == 'week' ? false : true;
    this.compare = this.getAttribute('compare') ?? 'congregations';

    this.domReferenceID = `${this.ministryQuestionID}-${[...document.querySelectorAll('.ministry-question-graph')].filter(elem => elem.getAttribute('ministry-question-id') == this.ministryQuestionID).length}`
    this.accentColor = '#2c3e50';
    this.graphColors = ['#3498db','#f1c40f','#e74c3c','#2ecc71','#e67e22','#9b59b6','#1abc9c'];

    this.requestURL = 'http://localhost:3000/api/widgets'
    // this.requestURL = 'https://phc.events/api/widgets'

    this.draw();
  }

  getMinistryQuestion = async () => {
    return await axios({
      method: 'get',
      url: `${this.requestURL}/ministry-question`,
      params: {
        ministryQuestionID: this.ministryQuestionID
      }
    })
      .then(response => response.data)
      .catch(err => console.error(err))
  }

  getWeeklyAnswers = async () => {
    return await axios({
      method: 'get',
      url: `${this.requestURL}/ministry-answers-weekly`,
      params: {
        ministryQuestionID: this.ministryQuestionID
      }
    })
    .then(response => response.data)
    .catch(err => console.error(err))
  }

  getPeriodAnswers = async () => {
    return await axios({
      method: 'get',
      url: `${this.requestURL}/ministry-answers-monthly`,
      params: {
        ministryQuestionID: this.ministryQuestionID
      }
    })
    .then(response => response.data)
    .catch(err => console.error(err))
  }

  formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'})
  }

  draw = () => {
    this.innerHTML = `
      <div class="ministry-graph-container">
        <div class="graph-type-container">
          <button id="type-graph-${this.domReferenceID}" class="type-graph-btn active">Graph</button>
          <button id="type-chart-${this.domReferenceID}" class="type-chart-btn">Table</button>
        </div>

        <div class="graph-body">
          <div class="title-container">
            <h1 id="graph-title-${this.domReferenceID}"></h1>
          </div>

          <div class="graph-row">
            <div class="graph-slider" id="graph-slider-${this.domReferenceID}">
              <div class="slider-body graph">
                <div class="graph-container" id="chart-container-${this.domReferenceID}">
                  <canvas class="ministry-question-graph" ministry-question-id="${this.ministryQuestionID}" id="ministry-graph-${this.domReferenceID}"></canvas>
                </div>

                <h2 id="date-range-label-${this.domReferenceID}"></h2>
                <div class="range-container" id="range-container-${this.domReferenceID}">
                  <div class="wrapper">
                      <div class="slider-track" id="slider-track-${this.domReferenceID}"></div>
                      <input type="range" min="0" max="1" value="0" id="slider-1-${this.domReferenceID}">
                      <input type="range" min="0" max="1" value="1" id="slider-2-${this.domReferenceID}">
                  </div>
                </div>
              </div>

              <div class="slider-body table" id="table-container-${this.domReferenceID}">
              
              </div>
            </div>
          </div>
        </div>

      </div>
      
    `
    
    const ctx = document.getElementById(`ministry-graph-${this.domReferenceID}`);
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {},
      options: {
        maintainAspectRatio: false,
        responsive: true
      }
    });

    const typeGraphBtnDOM = document.querySelector(`#type-graph-${this.domReferenceID}`);
    const typeChartBtnDOM = document.querySelector(`#type-chart-${this.domReferenceID}`);
    typeGraphBtnDOM.onclick = () => {
      typeGraphBtnDOM.classList.add('active');
      typeChartBtnDOM.classList.remove('active');
      graphSliderDOM.scrollTo(0,0)
    }
    typeChartBtnDOM.onclick = () => {
      typeGraphBtnDOM.classList.remove('active');
      typeChartBtnDOM.classList.add('active');
      graphSliderDOM.scrollTo(graphSliderDOM.scrollWidth,0)
    }

    const graphSliderDOM = document.getElementById(`graph-slider-${this.domReferenceID}`);

    const slider1DOM = document.getElementById(`slider-1-${this.domReferenceID}`);
    const slider2DOM = document.getElementById(`slider-2-${this.domReferenceID}`);
    slider1DOM.oninput = () => this.handleSliderInput(slider1DOM, slider2DOM, -1);
    slider2DOM.oninput = () => this.handleSliderInput(slider2DOM, slider1DOM, 1);

    // initialize touch inputs
    let touchStartX = null;
    const threshold = 100;
    const excludedElement = document.getElementById(`range-container-${this.domReferenceID}`);
    graphSliderDOM.addEventListener('touchstart', (event) => {
      if (!excludedElement.contains(event.target)) {
        touchStartX = event.changedTouches[0].clientX;
      } else {
        touchStartX = null;
      }
    }, false);
    graphSliderDOM.addEventListener('touchend', (event) => {
      let touchEndX = event.changedTouches[0].clientX;
      handleSwipe(touchStartX, touchEndX);
    }, false);

    const handleSwipe = (touchStartX, touchEndX) => {
      let difference = touchStartX - touchEndX;
      if (Math.abs(difference) >= threshold) {
        if (touchStartX < touchEndX) {
          typeGraphBtnDOM.classList.add('active');
          typeChartBtnDOM.classList.remove('active');
          graphSliderDOM.scrollTo(0,0)
        } else {
          typeGraphBtnDOM.classList.remove('active');
          typeChartBtnDOM.classList.add('active');
          graphSliderDOM.scrollTo(graphSliderDOM.scrollWidth,0)
        }
      }
    }
    
    this.update();
  }

  update = async () => {
    this.ministryQuestion = await this.getMinistryQuestion();
    this.weeklyAnswers = await this.getWeeklyAnswers();
    this.periodAnswers = await this.getPeriodAnswers();

    this.data = this.monthly ? this.periodAnswers : this.weeklyAnswers;

    this.distinctCongregations = this.data.reduce((acc, congregation) => {
      if (acc.findIndex(c => c.Congregation_ID === congregation.Congregation_ID) === -1) {
        acc.push({
          Congregation_ID: congregation.Congregation_ID,
          Congregation_Name: congregation.Congregation_Name,
        });
      }
      return acc;
    }, []).sort((a, b) => a.Congregation_ID - b.Congregation_ID);

    // Next, create the Map for the date values
    const dateMap = new Map();

    this.data.forEach((item) => {
      let date = this.formatDate(item.Ministry_Week_Start ?? item.Fiscal_Period_Start);

      // check if the date is already present in the Map
      if (!dateMap.has(date)) {
        // Initialize the values array with an object for each congregation, defaulting the value to 0
        dateMap.set(date, Array.from(this.distinctCongregations.map(congregation => congregation.Congregation_ID), id => ({ congregationId: id, value: 0 })));
      }

      // Find the object for this congregation and update the value
      let congregation = dateMap.get(date).find(({ congregationId }) => congregationId === item.Congregation_ID);
      if (congregation) {
        congregation.value = item.Numerical_Value;
      }
    });
    // Convert the Map to the desired array format
    const result = Array.from(dateMap, ([date, values]) => ({ date, values }));

    this.result = result;



    // prepare sliders
    const slider1DOM = document.getElementById(`slider-1-${this.domReferenceID}`);
    const slider2DOM = document.getElementById(`slider-2-${this.domReferenceID}`);
    slider1DOM.max = this.result.length;
    slider2DOM.max = this.result.length;
    slider2DOM.value = slider2DOM.max;

    this.updateCharts();
  }

  updateCharts = (graphStart = 0, graphEnd = Infinity) => {
    const congregationNames = this.distinctCongregations.map(congregation => congregation.Congregation_Name);

    const graphTitleDOM = document.getElementById(`graph-title-${this.domReferenceID}`);
    graphTitleDOM.textContent = this.ministryQuestion.Question_Title;

    const tableContainerDOM = document.getElementById(`table-container-${this.domReferenceID}`);
    tableContainerDOM.innerHTML = '';

    const dataTable = document.createElement('table')
    tableContainerDOM.appendChild(dataTable)

    const tableHeaders = [this.monthly ? 'Month' : 'Week'].concat(congregationNames);

    const headerRow = document.createElement('thead');
    tableHeaders.forEach(header => {
      const headerCell = document.createElement('th');
      headerCell.textContent = header;
      headerRow.appendChild(headerCell)
    })
    dataTable.appendChild(headerRow)
    
    // Iterate over each entry in the result array
    this.result.forEach((entry) => {
      // Create a new row element
      let row = document.createElement('tr');
      
      // Add a cell for the date
      let dateCell = document.createElement('td');
      dateCell.textContent = entry.date;
      row.appendChild(dateCell);
      
      // Iterate over the values array
      entry.values.forEach((valueObj) => {
        // Add a cell for each value
        let valueCell = document.createElement('td');
        // valueCell.textContent = `ID: ${valueObj.congregationId}, Value: ${valueObj.value}`;
        valueCell.textContent = valueObj.value;
        row.appendChild(valueCell);
      });
      
      // Append the row to the table body
      dataTable.appendChild(row);
    });


    // CREATE GRAPH BY CONGREGATION
    const graphResult = this.result.slice(graphStart, graphEnd);

    const graphLabels = graphResult.map(data => data.date);

    const dateRangeLabelsDOM = document.getElementById(`date-range-label-${this.domReferenceID}`);
    dateRangeLabelsDOM.textContent = `${graphLabels[0]} - ${graphLabels[graphLabels.length - 1]}`

    const dataSets = congregationNames.map((congregation, i) => {
      return {
        label: `${this.ministryQuestion.Question_Header} (${congregation})`,
        data: graphResult.map(data => data.values[i].value),
        fill: false,
        borderColor: this.graphColors[i],
        tension: .1
      }
    })



    // CREATE GRAPH BY YEAR
    const dataByYear = [];
    let currYearData = [];
    
    graphResult.forEach((data, i) => {
      const { date, values } = data;
    
      const currYear = new Date(date).getFullYear();
      const prevYear = i > 0 ? new Date(graphResult[i - 1].date).getFullYear() : null;
      
      // if it's a new year or the first element
      if (i === 0 || currYear !== prevYear) {
        // if it's not the first element, push the current year data into dataByYear
        if (i !== 0) {
          dataByYear.push({
            year: currYear,
            data: currYearData
          });
        }
        // start a new currYearData for the new year
        currYearData = [];
      }
    
      // push the data object into currYearData
      currYearData.push(values.reduce((accum, val) => val.value + accum, 0));

      if (i == graphResult.length-1) {
        // push the last year's data
        dataByYear.push({
          year: currYear,
          data: currYearData
        });
      }
    });

    const labelsByYear = this.monthly ? [...new Set(graphResult.map(data => new Date(data.date).toLocaleString('default', { month: 'short' })))] : Array.from({length: Math.max(...dataByYear.map(dataset => dataset.data.length))}, (_, i) => `week ${i + 1}`)

    const dataSetsByYear = dataByYear.map((dataset, i) => {
      const { year, data } = dataset;
      return {
        label: year,
        data: data,
        fill: false,
        borderColor: this.graphColors[i],
        tension: .1
      }
    })

    if (this.compare == 'years') {
      this.chart.data = {
        labels: labelsByYear,
        datasets: dataSetsByYear
      }
    } else {
      this.chart.data = {
        labels: graphLabels,
        datasets: dataSets
      }
    }
    

    this.chart.update();

    

    tableContainerDOM.style.maxHeight = `${document.getElementById(`graph-slider-${this.domReferenceID}`).offsetHeight}px`;
  }

  handleSliderInput = (currSlider, otherSlider, gap = 4) => {
    const slider1DOM = document.getElementById(`slider-1-${this.domReferenceID}`);
    const slider2DOM = document.getElementById(`slider-2-${this.domReferenceID}`);
    const sliderTrackDOM = document.getElementById(`slider-track-${this.domReferenceID}`)
    
    if(parseInt(slider2DOM.value) - parseInt(slider1DOM.value) <= Math.abs(gap)){
      currSlider.value = parseInt(otherSlider.value) + gap;
    }

    const percent1 = (slider1DOM.value / slider1DOM.max) * 100;
    const percent2 = (slider2DOM.value / slider2DOM.max) * 100;
    sliderTrackDOM.style.background = `linear-gradient(to right, #00000000 ${percent1}% , ${this.accentColor} ${percent1}% , ${this.accentColor} ${percent2}%, #00000000 ${percent2}%)`;

    this.updateCharts(parseInt(slider1DOM.value), parseInt(slider2DOM.value))
  }
}

customElements.define('ministry-question-graph', MinistryQuestionGraph);