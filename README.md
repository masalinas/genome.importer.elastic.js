# Description
Genome Importer Elastic JS

# Infrastructure
Execute this command to create the infrastructure about database:

Create a genome network in docker

```
docker network create genome
```

Start single node elasticsearch cluster in development mode

```
docker run -d --name genome-elastic-db -p 9200:9200 -p 9300:9300 -e "discovery.type=single-node" --network=genome docker.elastic.co/elasticsearch/elasticsearch:7.5.2
```

Start elasticHQ to manage the cluster

```
docker run -d -p 5000:5000 --name elasticsearch-hq elastichq/elasticsearch-hq
```


# Connect to Elasticsearch

Recover the elasticsearch cluster node
```
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' genome-elastic-db
172.21.0.2
```

Open elasticHQ in browset and conenct to http://172.21.0.2

![elasticHQ Dashboard](captures/elasticHQ.png)