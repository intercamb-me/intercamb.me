FROM keymetrics/pm2:8-alpine
WORKDIR /usr/src/intercamb
COPY ./package*.json ./
RUN \
  echo "https://dl-3.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories && \
  echo "https://dl-3.alpinelinux.org/alpine/edge/main" >> /etc/apk/repositories && \
  echo "https://dl-3.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories && \
  apk --no-cache update && \
  apk add --update --no-cache --virtual .build-deps make gcc g++ python libc6-compat && \
  apk add --update --no-cache vips-dev fftw-dev build-base && \
  npm install --production && \
  npm rebuild bcrypt --build-from-source && \
  apk del .build-deps fftw-dev && \
  rm -rf /var/cache/apk/* /tmp/* && \
  touch config.yml
COPY . .
EXPOSE 3000
