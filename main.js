class MinistryQuestionGraph extends HTMLElement {
  constructor() {
    super();

    
    this.ministryQuestionID = this.getAttribute('ministry-question-id');
    this.domReferenceID = `${this.ministryQuestionID}-${[...document.querySelectorAll('.ministry-question-graph')].filter(elem => elem.getAttribute('ministry-question-id') == this.ministryQuestionID).length}`
    this.accentColor = '#2c3e50';
    this.graphColors = ['#3498db','#f1c40f','#e74c3c','#2ecc71','#e67e22','#9b59b6','#1abc9c']

    this.draw();
  }

  getAccessToken = async () => {
    const data = await axios({
        method: 'post',
        url: 'https://my.pureheart.org/ministryplatformapi/oauth/connect/token',
    })
        .then(response => response.data)
    const {access_token, expires_in} = data;
    const expiresDate = new Date(new Date().getTime() + (expires_in * 1000)).toISOString()
    return access_token;
  }

  getMinistryQuestion = async () => {
    return await axios({
      method: 'get',
      url: `https://my.pureheart.org/ministryplatformapi/tables/Ministry_Questions/${this.ministryQuestionID}`,
      headers: {
        'Authorization': `Bearer ${await this.getAccessToken()}`,
        'Content-Type': 'Application/JSON'
      }
    })
      .then(response => response.data[0])
      .catch(err => console.error(err))
  }

  getWeeklyAnswers = async () => {
    return await axios({
      method: 'get',
      url: `https://my.pureheart.org/ministryplatformapi/tables/Ministry_Answers`,
      params: {
        $filter: `Ministry_Question_ID = ${this.ministryQuestionID}`,
        $select: `Ministry_Week_ID_Table.[Ministry_Week_Start], Ministry_Answer_ID, Ministry_Answers.[Ministry_Week_ID], Ministry_Question_ID, Numerical_Value, Ministry_Answers.[Congregation_ID], Congregation_ID_Table.[Congregation_Name], Ministry_ID, Program_ID, Type`,
        $orderby: `Ministry_Week_ID_Table.[Ministry_Week_Start]`
      },
      headers: {
        'Authorization': `Bearer ${await this.getAccessToken()}`,
        'Content-Type': 'Application/JSON'
      }
    })
    .then(response => response.data)
    .catch(err => console.error(err))
  }

  getPeriodAnswers = async () => {
    return await axios({
      method: 'get',
      url: `https://my.pureheart.org/ministryplatformapi/tables/Fiscal_Period_Answers`,
      params: {
        $filter: `Ministry_Question_ID = ${this.ministryQuestionID}`,
        $select: `Fiscal_Period_ID_Table.[Fiscal_Period_Start], Fiscal_Period_Answer_ID, Fiscal_Period_Answers.[Fiscal_Period_ID], Ministry_Question_ID, Numerical_Value, Fiscal_Period_Answers.[Congregation_ID], Congregation_ID_Table.[Congregation_Name], Ministry_ID, Program_ID, Type`,
        $orderby: `Fiscal_Period_ID_Table.[Fiscal_Period_Start]`
      },
      headers: {
        'Authorization': `Bearer ${await this.getAccessToken()}`,
        'Content-Type': 'Application/JSON'
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
                <div class="range-container">
                  <div class="wrapper">
                      <div class="slider-track" id="slider-track-${this.domReferenceID}"></div>
                      <input type="range" min="0" max="1" value="0" id="slider-1-${this.domReferenceID}">
                      <input type="range" min="0" max="1" value="1" id="slider-2-${this.domReferenceID}">
                  </div>
                </div>
              </div>

              <div class="slider-body" id="table-container-${this.domReferenceID}">
              
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
    // periodMonthlyBtnDOM.onclick = () => {
    //   periodMonthlyBtnDOM.classList.add('active');
    //   periodWeeklyBtnDOM.classList.remove('active');
    //   this.monthly = true;
    //   this.updateCharts();
    // }
    // periodWeeklyBtnDOM.onclick = () => {
    //   periodWeeklyBtnDOM.classList.add('active');
    //   periodMonthlyBtnDOM.classList.remove('active');
    //   this.monthly = false;
    //   this.updateCharts();
    // }

    const graphSliderDOM = document.getElementById(`graph-slider-${this.domReferenceID}`);
    const prevViewBtnDOM = document.getElementById(`prev-view-${this.domReferenceID}`);
    const nextViewBtnDOM = document.getElementById(`next-view-${this.domReferenceID}`);


    const slider1DOM = document.getElementById(`slider-1-${this.domReferenceID}`);
    const slider2DOM = document.getElementById(`slider-2-${this.domReferenceID}`);
    slider1DOM.oninput = () => this.handleSliderInput(slider1DOM, slider2DOM, -10);
    slider2DOM.oninput = () => this.handleSliderInput(slider2DOM, slider1DOM, 10);
    
    this.update();
  }

  update = async () => {
    this.ministryQuestion = await this.getMinistryQuestion();
    this.weeklyAnswers = await this.getWeeklyAnswers();
    this.periodAnswers = await this.getPeriodAnswers();
    this.monthly = this.getAttribute('scale') == 'week' ? false : true;

    const graphTitleDOM = document.getElementById(`graph-title-${this.domReferenceID}`);
    graphTitleDOM.textContent = this.ministryQuestion.Question_Title;
    
    const slider2DOM = document.getElementById(`slider-2-${this.domReferenceID}`);
    slider2DOM.max = Infinity;
    slider2DOM.value = Infinity;
    
    this.updateCharts()
  }

  updateCharts = (graphStart = 0, graphEnd = Infinity) => {
    const data = this.monthly ? this.periodAnswers : this.weeklyAnswers;

    const distinctCongregations = [];

    for (const congregation of data) {
      // Check if the congregation already exists in the distinctCongregations array
      const existingCongregation = distinctCongregations.find(
        (c) => c.Congregation_ID === congregation.Congregation_ID
      );

      // If the congregation doesn't exist, add it to the distinctCongregations array
      if (!existingCongregation) {
        distinctCongregations.push({
          Congregation_ID: congregation.Congregation_ID,
          Congregation_Name: congregation.Congregation_Name,
        });
      }
    }

    distinctCongregations.sort((a, b) => a.Congregation_ID - b.Congregation_ID);
    // const allCongregationIDs = new Set(data.map(item => item.Congregation_ID));
    const allCongregationIDs = distinctCongregations.map(congregation => congregation.Congregation_ID);
    const allCongregations = distinctCongregations.map(congregation => congregation.Congregation_Name);

    // table info

    const tableContainerDOM = document.getElementById(`table-container-${this.domReferenceID}`);
    tableContainerDOM.innerHTML = '';

    const dataTable = document.createElement('table')
    tableContainerDOM.appendChild(dataTable)

    const tableHeaders = [this.monthly ? 'Month' : 'Week'].concat(allCongregations)

    // Next, create the Map for the date values
    const dateMap = new Map();

    data.forEach((item) => {
      let date = this.formatDate(item.Ministry_Week_Start ?? item.Fiscal_Period_Start);

      // check if the date is already present in the Map
      if (!dateMap.has(date)) {
        // Initialize the values array with an object for each congregation, defaulting the value to 0
        dateMap.set(date, Array.from(allCongregationIDs, id => ({ congregationId: id, value: 0 })));
      }

      // Find the object for this congregation and update the value
      let congregation = dateMap.get(date).find(({ congregationId }) => congregationId === item.Congregation_ID);
      if (congregation) {
        congregation.value = item.Numerical_Value;
      }
    });
    // Convert the Map to the desired array format
    let result = Array.from(dateMap, ([date, values]) => ({ date, values }));

    const headerRow = document.createElement('thead');
    tableHeaders.forEach(header => {
      const headerCell = document.createElement('th');
      headerCell.textContent = header;
      headerRow.appendChild(headerCell)
    })
    dataTable.appendChild(headerRow)
    
    // Iterate over each entry in the result array
    result.forEach((entry) => {
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


    // graph stuff
    const graphResult = result.slice(graphStart, graphEnd);

    const graphLabels = graphResult.map(data => data.date);

    const dateRangeLabelsDOM = document.getElementById(`date-range-label-${this.domReferenceID}`);
    dateRangeLabelsDOM.textContent = `${graphLabels[0]} - ${graphLabels[graphLabels.length - 1]}`

    const dataSets = allCongregations.map((congregation, i) => {
      return {
        label: `${data[0].Type ?? this.ministryQuestion.Question_Header} (${congregation})`,
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

    this.chart.update();
    

    // prepare sliders
    const slider1DOM = document.getElementById(`slider-1-${this.domReferenceID}`);
    const slider2DOM = document.getElementById(`slider-2-${this.domReferenceID}`);
    slider1DOM.max = result.length;
    slider2DOM.max = result.length;
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