class MinistryQuestionGraph extends HTMLElement {
  constructor() {
    super();

    this.ministryQuestionID = this.getAttribute('ministry-question-id');
    this.accentColor = '#2c3e50';
    this.graphColors = ['#3498db','#f1c40f','#e74c3c','#2ecc71','#e67e22','#9b59b6','#1abc9c']

    this.draw();
  }

  getAccessToken = async () => {
    const data = await axios({
        method: 'post',
        url: 'https://my.pureheart.org/ministryplatformapi/oauth/connect/token',
        data: ''
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
        <div class="period-select-container">
          <button id="period-month-${this.ministryQuestionID}" class="period-month-btn active">Monthly</button>
          <button id="period-week-${this.ministryQuestionID}" class="period-week-btn">Weekly</button>
        </div>

        <div class="title-container">
          <h1 id="graph-title-${this.ministryQuestionID}"></h1>
        </div>

        <div class="graph-row">
          <button id="prev-view-${this.ministryQuestionID}"><i class='fa fa-angle-left'></i></button>
          <div class="graph-slider" id="graph-slider-${this.ministryQuestionID}">
            <div class="slider-body" id="chart-container-${this.ministryQuestionID}">
              <canvas id="ministry-graph-${this.ministryQuestionID}"></canvas>
            </div>

            <div class="slider-body" id="table-container-${this.ministryQuestionID}">
            
            </div>
          </div>
          <button id="next-view-${this.ministryQuestionID}"><i class='fa fa-angle-right'></i></button>
        </div>
      </div>
      
    `
    
    const ctx = document.getElementById(`ministry-graph-${this.ministryQuestionID}`);
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {}
    });

    const periodMonthlyBtnDOM = document.querySelector(`#period-month-${this.ministryQuestionID}`);
    const periodWeeklyBtnDOM = document.querySelector(`#period-week-${this.ministryQuestionID}`);
    periodMonthlyBtnDOM.onclick = () => {
      periodMonthlyBtnDOM.classList.add('active');
      periodWeeklyBtnDOM.classList.remove('active');
      this.monthly = true;
      this.updateCharts();
    }
    periodWeeklyBtnDOM.onclick = () => {
      periodWeeklyBtnDOM.classList.add('active');
      periodMonthlyBtnDOM.classList.remove('active');
      this.monthly = false;
      this.updateCharts();
    }

    const graphSliderDOM = document.getElementById(`graph-slider-${this.ministryQuestionID}`);
    const prevViewBtnDOM = document.getElementById(`prev-view-${this.ministryQuestionID}`);
    const nextViewBtnDOM = document.getElementById(`next-view-${this.ministryQuestionID}`);
    prevViewBtnDOM.onclick = () => graphSliderDOM.scrollTo(0,0)
    nextViewBtnDOM.onclick = () => graphSliderDOM.scrollTo(graphSliderDOM.scrollWidth,0)
    
    this.update();
  }

  update = async () => {
    this.ministryQuestion = await this.getMinistryQuestion();
    this.weeklyAnswers = await this.getWeeklyAnswers();
    this.periodAnswers = await this.getPeriodAnswers();
    this.monthly = true;

    const graphTitleDOM = document.getElementById(`graph-title-${this.ministryQuestionID}`);
    graphTitleDOM.textContent = this.ministryQuestion.Question_Title;

    // console.log(this.ministryQuestion);
    // console.log(this.weeklyAnswers);
    // console.log(this.periodAnswers);

    this.updateCharts()
  }

  updateCharts = () => {
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

    const tableContainerDOM = document.getElementById(`table-container-${this.ministryQuestionID}`);
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


    const graphLabels = result.map(data => data.date);

    const dataSets = allCongregations.map((congregation, i) => {
      return {
        label: `${data[0].Type ?? this.ministryQuestion.Question_Header} (${congregation})`,
        data: result.map(data => data.values[i].value),
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

  }
}

customElements.define('ministry-question-graph', MinistryQuestionGraph);