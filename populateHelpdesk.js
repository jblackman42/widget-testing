const getTickets = async () => {
  return fetch('./csvjson.json')
    .then(response => response.json())
}

const getAccessToken =  async () => {
  const body = {
    grant_type: 'password',
    scope: 'http://www.thinkministry.com/dataplatform/scopes/all',
    client_id: 'event-plannner',
    username: 'JBlackman',
    password: 'Jd21678400='
  }
  return await axios({
    method: 'post',
    url: 'https://my.pureheart.org/ministryplatformapi/oauth/connect/token',
    data: Object.keys(body).map(key => key + '=' + body[key]).join('&'),
    headers: {
      'Authorization': 'Basic ZXZlbnQtcGxhbm5lcjp6elgqQFNORlJmekFrbiFlIXhGQHUyMjNSJVhSUU5QJg=='
    }
  })
    .then(response => response.data.access_token)
    .catch(err => console.error(err))
}

const getContactID = async (name, email, access_token) => {
  return await axios({
    method: 'post',
    url: 'https://my.pureheart.org/ministryplatformapi/procs/API_PHCSelectMatchingContact',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    data: {
      '@FullName': name,
      '@EmailAddress': email
    }
  })
    .then(response => response.data[0][0].Contact_ID || 2)
    .catch(err => console.error(err))
}

const getGoodDateData = (dateString) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return date.toISOString();
  } catch (error) {
    return new Date(0).toISOString();
  }
}

const populateHelpdesk = async () => {
  const tickets = await getTickets();
  const access_token = await getAccessToken();
  const filteredTickets = tickets.filter(ticket => {
    const { "Resolved time": resolvedTime, "Closed time": closeTime } = ticket;
    return resolvedTime || closeTime
  })

  // filteredTickets.length = 200;

  let counter = 0;
  const currentTickets = [];
  for (const ticket of filteredTickets) {
    const { Subject, Description, Type, Group, Status, Priority, Source, Agent, "Created time": createdTime, "Resolved time": resolvedTime, "Closed time": closeTime, "Full name": fullName, Email } = ticket;
    const fixedSubject = Subject || 'No Subject';
    const MPTicket = {
      "Ticket_Requestor": await getContactID(fullName, Email, access_token),
      "Request_Date": getGoodDateData(createdTime),
      "Request_Title": fixedSubject.substring(0, 254),
      "Description": Description,
      "Tag": Type == "Ministry Platform User SPoC" || Type == "Ministry Platform IT SPoc" ? 3 : Type == "Web" ? 7 : Type == "IT Infrastructure" ? 2 : Type == "Onboarding/Offboarding" ? 4 : 1,
      "Status": Status == "Resolved" ? 3 : 4,
      "Agent": 3,
      "Priority": Priority == "Urgent" ? 4 : Priority == "High" ? 3 : Priority == "Medium" ? 2 : 1,
      "Resolve_Date": resolvedTime ? getGoodDateData(resolvedTime) : getGoodDateData(closeTime),
      "IT_Ticket_Request_Method_ID": Source == "Walk-In" ? 2 : Source == "Teams/Text/Call" || Source == "Ticket/Email" ? 3 : 4
    }

    currentTickets.push(MPTicket)
    counter ++;
    console.log(`${counter} / ${filteredTickets.length}`)

    const pushSize = 500;
    if (counter % pushSize != 0 && counter < filteredTickets.length) continue;

    console.log(`uploading ${currentTickets.length} tickets`)
    await axios({
      method: 'post',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/IT_Help_Tickets',
      data: currentTickets,
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.data)
      .catch(err => console.error(err))

    currentTickets.length = 0;
  }
}