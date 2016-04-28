### aws-es-kibana

AWS Elasticsearch/Kibana proxy to access your policy-secured AWS ES cluster.

#### usage

Start the proxy server using the specified aws credentials.

```bash
$ export ES_ENDPOINT=search-es-1234.us-east-1.es.amazonaws.com
$ export AWS_ACCESS_KEY_ID=1234
$ export AWS_SECRET_ACCESS_KEY=1234
$ node .
```
