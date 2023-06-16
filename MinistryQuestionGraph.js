class MinistryQuestionGraphV2 extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // GLOBAL VARS/PARAMETERS
      this.ministryQuestionID = this.getAttribute('question-id');
      this.monthly = this.getAttribute('scale') ?? 'month';
      this.compare = this.getAttribute('compare') ?? 'congregations';
      this.chartType = this.getAttribute('chart-type') ?? 'line';
      // creates a unique id to refer to this specific widget
      this.domReferenceID = `${this.ministryQuestionID}-${[...document.querySelectorAll('.ministry-question-graph')].filter(elem => elem.getAttribute('ministry-question-id') == this.ministryQuestionID).length}`
      // the uri to make api requests
      this.requestURI = 'http://localhost:3000/api/widgets';
      // colors
      this.accentColor = '#2c3e50';
      this.graphColors = ['#3498db','#f1c40f','#e74c3c','#2ecc71','#e67e22','#9b59b6','#1abc9c'];
    
    // MINISTRY QUESTION DATA
    this.ministryQuestion = null;
    this.weeklyAnswers = null;
    this.periodAnswers = null;

    // define required params and throw error if they are missing
    const requiredParams = [this.ministryQuestionID];
    if (requiredParams.some(v => v === null)) {
      console.error('Error: Missing required parameters. Please verify and provide all necessary parameters.');
      return;
    }

    this.draw();
  }

  // API CALL FUNCTIONS
  getMinistryQuestion = async () => {
    return await axios({
      method: 'get',
      url: `${this.requestURI}/ministry-question`,
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
      url: `${this.requestURI}/ministry-answers-weekly`,
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
      url: `${this.requestURI}/ministry-answers-monthly`,
      params: {
        ministryQuestionID: this.ministryQuestionID
      }
    })
    .then(response => response.data)
    .catch(err => console.error(err))
  }

  // GENERAL FUNCTIONS
  loading = () => {
    const loadingScreen = this.shadowRoot.getElementById('loadingScreen')
    loadingScreen.style.visibility = 'visible';
    loadingScreen.style.display = 'grid';
  }
  doneLoading = () => {
    const loadingScreen = this.shadowRoot.getElementById('loadingScreen')
    loadingScreen.style.visibility = 'hidden';
    loadingScreen.style.display = 'none';
  }

  handleSliderInput = (currSlider, otherSlider, gap = 4) => {
    const slider1DOM = this.shadowRoot.getElementById(`slider-1-${this.domReferenceID}`);
    const slider2DOM = this.shadowRoot.getElementById(`slider-2-${this.domReferenceID}`);
    const sliderTrackDOM = this.shadowRoot.getElementById(`slider-track-${this.domReferenceID}`)
    
    if(parseInt(slider2DOM.value) - parseInt(slider1DOM.value) <= Math.abs(gap)){
      currSlider.value = parseInt(otherSlider.value) + gap;
    }

    const percent1 = (slider1DOM.value / slider1DOM.max) * 100;
    const percent2 = (slider2DOM.value / slider2DOM.max) * 100;
    sliderTrackDOM.style.background = `linear-gradient(to right, #00000000 ${percent1}% , ${this.accentColor} ${percent1}% , ${this.accentColor} ${percent2}%, #00000000 ${percent2}%)`;

    this.updateCharts(parseInt(slider1DOM.value), parseInt(slider2DOM.value))
  }


  handleRangUpdate = (filterFunction) => {
    if (!this.allLabels) return;
    
    const slider1DOM = this.shadowRoot.getElementById(`slider-1-${this.domReferenceID}`);
    const slider2DOM = this.shadowRoot.getElementById(`slider-2-${this.domReferenceID}`);

    const currYearLabels = this.allLabels.filter(filterFunction)
    const yearStartIndex = this.allLabels.indexOf(currYearLabels[0]);
    const yearEndIndex = this.allLabels.indexOf(currYearLabels[currYearLabels.length-1]) + 1;

    slider1DOM.value = yearStartIndex;
    slider2DOM.value = yearEndIndex;
    this.handleSliderInput(slider1DOM, slider2DOM, -1);
    
    this.updateCharts(yearStartIndex, yearEndIndex)
  }


  // write the html to the custom element
  draw = () => {
    // create style link to add css styling
    const styleLink = document.createElement('link');
    styleLink.setAttribute('rel', 'stylesheet');
    styleLink.setAttribute('href', './ministryQuestionGraph.css')
    
    // create wrapper and populate html
    const wrapper = document.createElement('div');
    wrapper.classList.add('ministry-graph-container');
    wrapper.innerHTML = `
    <div id="loadingScreen">
      <div class="loader"></div>
    </div>
      <div class="graph-type-container">
        <button id="type-graph-${this.domReferenceID}" class="type-graph-btn active">Graph</button>
        <button id="type-chart-${this.domReferenceID}" class="type-chart-btn">Table</button>
        <button id="type-options-${this.domReferenceID}" class="type-options-btn">Options</button>
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

              ${this.compare == 'congregations' ? `
              <div class="range-header">
                <h2 id="date-range-label-${this.domReferenceID}"></h2>
                <button class="range-filter-btn" id="all-btn-${this.domReferenceID}">All</button>
                <button class="range-filter-btn" id="year-btn-${this.domReferenceID}">1 Yr</button>
                <button class="range-filter-btn" id="month-btn-${this.domReferenceID}">1 M</button>
                <button class="range-filter-btn" id="ytd-btn-${this.domReferenceID}">YTD</button>
              </div>
              <div class="range-container" id="range-container-${this.domReferenceID}">
                <div class="wrapper">
                    <div class="slider-track" id="slider-track-${this.domReferenceID}"></div>
                    <input type="range" min="0" max="1" value="0" id="slider-1-${this.domReferenceID}">
                    <input type="range" min="0" max="1" value="1" id="slider-2-${this.domReferenceID}">
                </div>
              </div>
              ` : ''}
            </div>

            <div class="slider-body table" id="table-container-${this.domReferenceID}">
            
            </div>

            <div class="slider-body options" id="options-container-${this.domReferenceID}">
              <form>
              </form>
            </div>
          </div>
        </div>
      </div>
    `
    // add everything to the DOM
    this.shadowRoot.append(styleLink, wrapper);

    // add functionality to tab buttons at top of graph
    const graphSliderDOM = this.shadowRoot.getElementById(`graph-slider-${this.domReferenceID}`);
    const typeGraphBtnDOM = this.shadowRoot.querySelector(`#type-graph-${this.domReferenceID}`);
    const typeChartBtnDOM = this.shadowRoot.querySelector(`#type-chart-${this.domReferenceID}`);
    const typeOptionsBtnDOM = this.shadowRoot.querySelector(`#type-options-${this.domReferenceID}`);
    typeGraphBtnDOM.onclick = () => {
      typeGraphBtnDOM.classList.add('active');
      typeChartBtnDOM.classList.remove('active');
      typeOptionsBtnDOM.classList.remove('active');
      graphSliderDOM.scrollTo(0,0)
    }
    typeChartBtnDOM.onclick = () => {
      typeGraphBtnDOM.classList.remove('active');
      typeChartBtnDOM.classList.add('active');
      typeOptionsBtnDOM.classList.remove('active');
      graphSliderDOM.scrollTo((graphSliderDOM.scrollWidth / 3) + 10,0) //divided into number of tabs, plus 10px for padding
    }
    typeOptionsBtnDOM.onclick = () => {
      typeGraphBtnDOM.classList.remove('active');
      typeChartBtnDOM.classList.remove('active');
      typeOptionsBtnDOM.classList.add('active');
      graphSliderDOM.scrollTo(graphSliderDOM.scrollWidth,0)
    }

    // add functionality to date slider
    if (this.compare == 'congregations') {
      const slider1DOM = this.shadowRoot.getElementById(`slider-1-${this.domReferenceID}`);
      const slider2DOM = this.shadowRoot.getElementById(`slider-2-${this.domReferenceID}`);
      slider1DOM.oninput = () => this.handleSliderInput(slider1DOM, slider2DOM, -1);
      slider2DOM.oninput = () => this.handleSliderInput(slider2DOM, slider1DOM, 1);

      // add functionality to filter buttons
      const allFilterBtnDOM = this.shadowRoot.getElementById(`all-btn-${this.domReferenceID}`);
      const yearFilterBtnDOM = this.shadowRoot.getElementById(`year-btn-${this.domReferenceID}`);
      const monthFilterBtnDOM = this.shadowRoot.getElementById(`month-btn-${this.domReferenceID}`);
      const ytdFilterBtnDOM = this.shadowRoot.getElementById(`ytd-btn-${this.domReferenceID}`);
      allFilterBtnDOM.onclick = () => this.handleRangUpdate(date => date)
      yearFilterBtnDOM.onclick = () => this.handleRangUpdate(date => {
        const today = new Date(new Date().getFullYear(), new Date().getMonth(), 0);
        today.setMonth(today.getMonth() + 1); // Set the date to next month
        today.setDate(0); // Set the date to the last day of the previous month (which is this month)
        
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(today.getFullYear() - 1);
        oneYearAgo.setMonth(today.getMonth() - 1);
        const currDate = new Date(date);
        return currDate >= oneYearAgo && currDate <= today;
      })
      monthFilterBtnDOM.onclick = () => this.handleRangUpdate(date => {
        const today = new Date();
        today.setMonth(today.getMonth() + 1); // Set the date to next month
        today.setDate(0); // Set the date to the last day of the previous month (which is this month)
        
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(today.getMonth() - (this.monthly ? 2 : 1));
        const currDate = new Date(date);
        return currDate >= oneMonthAgo && currDate <= today;
      })
      ytdFilterBtnDOM.onclick = () => this.handleRangUpdate(date => {
        return new Date(date).getFullYear() == new Date().getFullYear()
      })
    }

    // define graph and populate it on the page
    const ctx = this.shadowRoot.getElementById(`ministry-graph-${this.domReferenceID}`);
    this.chart = new Chart(ctx, {
      type: this.chartType,
      data: {},
      options: {
        maintainAspectRatio: false,
        responsive: true
      }
    });

    this.populate();
  }

  populate = async () => {
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'})
    }

    // BEGIN LOADING
    this.loading();
    
    let [ministryQuestion, weeklyAnswers, periodAnswers] = await Promise.all([
      this.getMinistryQuestion(),
      this.getWeeklyAnswers(),
      this.getPeriodAnswers()
    ]);
    this.ministryQuestion = ministryQuestion;
    this.weeklyAnswers = weeklyAnswers;
    this.periodAnswers = periodAnswers;

    // Chat-GPT wrote all of this
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
      let date = formatDate(item.Ministry_Week_Start ?? item.Fiscal_Period_Start);

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

    if (this.compare == 'congregations') {
    // prepare sliders with correct values based on ministry answers
    const slider1DOM = this.shadowRoot.getElementById(`slider-1-${this.domReferenceID}`);
    const slider2DOM = this.shadowRoot.getElementById(`slider-2-${this.domReferenceID}`);
    slider1DOM.max = this.result.length;
    slider2DOM.max = this.result.length;
    slider2DOM.value = slider2DOM.max;
    }
    
    this.updateCharts();
    
    // FINISH LOADING
    this.doneLoading();
  }

  updateCharts = (graphStart = 0, graphEnd = Infinity  ) => {
    this.congregationNames = this.distinctCongregations.map(congregation => congregation.Congregation_Name);

    const graphTitleDOM = this.shadowRoot.getElementById(`graph-title-${this.domReferenceID}`);
    graphTitleDOM.textContent = this.ministryQuestion.Question_Title;

    const tableContainerDOM = this.shadowRoot.getElementById(`table-container-${this.domReferenceID}`);
    const optionsContainerDOM = this.shadowRoot.getElementById(`options-container-${this.domReferenceID}`);
    tableContainerDOM.innerHTML = '';

    const dataTable = document.createElement('table');
    tableContainerDOM.appendChild(dataTable);

    // create different graphs based on compare parameter
    if (this.compare == 'years' && this.chartType == 'line') {
      this.createYearLinesChart();
    } else if (this.compare == 'congregations' && this.chartType == 'line') {
      this.createCongregationsLineChart(graphStart, graphEnd);
    } else if (this.chartType == 'pie' || this.chartType == 'doughnut') {
      this.createPieChart(graphStart, graphEnd);
    }

    // CREATE TABLE BASED ON CHART DATA
    const { datasets, labels } = this.chart.data;
    const tableHeaders = [this.monthly ? 'Month' : 'Week'].concat(datasets.map(dataset => dataset.label));

    const headerRow = document.createElement('thead');
    tableHeaders.forEach(header => {
      const headerCell = document.createElement('th');
      headerCell.textContent = header;
      headerRow.appendChild(headerCell)
    })
    dataTable.appendChild(headerRow)

    // console.log(this.result)
    
    // Iterate over each entry in the result array
    labels.forEach((label, i) => {
      // Create a new row element
      let row = document.createElement('tr');
      
      // Add a cell for the date
      let dateCell = document.createElement('td');
      dateCell.textContent = label;
      row.appendChild(dateCell);
      // Iterate over the values array
      datasets.forEach((dataset) => {
        // Add a cell for each value
        let valueCell = document.createElement('td');
        valueCell.textContent = dataset.data[i];
        row.appendChild(valueCell);
      });
      
      // Append the row to the table body
      dataTable.appendChild(row);
    });

    // update the chart with new information
    this.chart.update();    

    // set maxheight of table so it matches the chart
    tableContainerDOM.style.maxHeight = `${this.shadowRoot.getElementById(`graph-slider-${this.domReferenceID}`).offsetHeight}px`;
    optionsContainerDOM.style.maxHeight = `${this.shadowRoot.getElementById(`graph-slider-${this.domReferenceID}`).offsetHeight}px`;
  }

  createYearsLineChart = () => {
    // CREATE GRAPH BY YEAR
    const dataByYear = [];
    let currYearData = [];
    
    this.result.forEach((data, i) => {
      const { date, values } = data;
    
      const currYear = new Date(date).getFullYear();
      const prevYear = i > 0 ? new Date(this.result[i - 1].date).getFullYear() : null;

      if (i == 0) {
        currYearData = Array.from({length: new Date(date).getMonth()}, () => null)
      } else if (currYear !== prevYear) {
        dataByYear.push({
          year: prevYear,
          data: currYearData
        });
        currYearData = [];
      }
      currYearData.push(values.reduce((accum, val) => Math.round(((val.value + accum) + Number.EPSILON) * 100) / 100, 0));

      if (i == this.result.length-1) {
        // push the last year's data
        dataByYear.push({
          year: currYear,
          data: currYearData
        });
      }
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const labelsByYear = this.monthly ? Array.from({length: 12}, (_,i)=>months[i]) : Array.from({length: Math.max(...dataByYear.map(dataset => dataset.data.length))}, (_, i) => `week ${i + 1}`)

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

    this.chart.data = {
      labels: labelsByYear,
      datasets: dataSetsByYear
    }
  }

  createCongregationsLineChart = (graphStart, graphEnd) => {
    // CREATE GRAPH BY CONGREGATION
    this.allLabels = this.result.map(data => data.date);
    const graphResult = this.result.slice(graphStart, graphEnd);

    const graphLabels = graphResult.map(data => data.date);

    const dateRangeLabelsDOM = this.shadowRoot.getElementById(`date-range-label-${this.domReferenceID}`);
    dateRangeLabelsDOM.textContent = `${graphLabels[0]} - ${graphLabels[graphLabels.length - 1]}`

    const dataSets = this.congregationNames.map((congregation, i) => {
      return {
        label: `${this.ministryQuestion.Question_Header} (${congregation})`,
        data: graphResult.map(data => data.values[i].value),
        fill: false,
        borderColor: this.graphColors[i],
        tension: .1
      }
    })

    this.chart.data = {
      labels: graphLabels,
      datasets: dataSets
    }

  }

  createPieChart = (graphStart, graphEnd) => {
    const graphResult = this.result.slice(graphStart, graphEnd);

    const graphLabels = graphResult.map(data => data.date);

    const dateRangeLabelsDOM = this.shadowRoot.getElementById(`date-range-label-${this.domReferenceID}`);
    dateRangeLabelsDOM.textContent = `${graphLabels[0]} - ${graphLabels[graphLabels.length - 1]}`

    const congregationSums = this.congregationNames.map((name, i) => {
      return graphResult.reduce((accum, val) => Math.round(((val.values[i].value + accum) + Number.EPSILON) * 100) / 100, 0)
    })
    console.log(congregationSums)
    this.chart.data = {
      labels: this.congregationNames,
      datasets: [{
        label: `${this.ministryQuestion.Question_Header}`,
        data: congregationSums,
        backgroundColor: this.graphColors
      }]
    }
  }
}

customElements.define('ministry-question-graph-v2', MinistryQuestionGraphV2);