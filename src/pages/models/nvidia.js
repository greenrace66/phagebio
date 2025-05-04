const url = 'https://health.api.nvidia.com/v1/biology/nvidia/esmfold';
const options = {
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: 'Bearer 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'
  },
  body: JSON.stringify({sequence: 'FVNQHLCGSHLVEALYLVCGERGFFYTPKA'})
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error(err));