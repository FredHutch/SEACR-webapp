# build as fredhutch/seacr

FROM ubuntu:18.04

## for apt to be noninteractive
ENV DEBIAN_FRONTEND noninteractive
ENV DEBCONF_NONINTERACTIVE_SEEN true

# need gnupg for later steps
RUN apt-get update -y && apt-get install -y gnupg2 ca-certificates

# key for R packages:
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-keys E298A3A825C0D65DFD57CBB651716619E084DAB9

RUN echo 'deb https://cloud.r-project.org/bin/linux/ubuntu bionic-cran35/' >> /etc/apt/sources.list

## preesed tzdata, update package index, upgrade packages and install needed software
RUN echo "tzdata tzdata/Areas select America" > /tmp/preseed.txt; \
    echo "tzdata tzdata/Zones/America select Los_Angeles" >> /tmp/preseed.txt; \
    debconf-set-selections /tmp/preseed.txt && \
    rm -f /etc/timezone && \
    rm -f /etc/localtime && \
    apt-get update && \
    apt-get install -y tzdata python3-dev python3-pip r-base curl

## cleanup of files from setup
RUN rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN curl -L -o /usr/local/bin/bedtools https://github.com/arq5x/bedtools2/releases/download/v2.28.0/bedtools  && chmod a+x /usr/local/bin/bedtools

ENV LC_ALL=C.UTF-8
ENV LANG=C.UTF-8


COPY . /SEACR-webapp

WORKDIR /SEACR-webapp

RUN pip3 install pipenv && pipenv install 


CMD ./run.sh

