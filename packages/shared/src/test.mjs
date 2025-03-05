import { request } from 'urllib'
import fs from 'fs'

const data = JSON.stringify({
  id: '5rwl6kv-BzP9mKvS9Y',
})

const config = {
  method: 'post',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ol_api_Fy5oax6Z2aKMHZM2nktOwPa91zyjCvzS5rA8iz',
  },
  data: data,
}
request('https://app.getoutline.com/api/documents.export', config).then(({ data }) => {
  const content = JSON.parse(data).data
  fs.writeFileSync('./test.md', content, {
    encoding: 'utf8',
  })
})
