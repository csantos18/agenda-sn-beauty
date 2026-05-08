FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5175

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5175

CMD ["npm", "start"]
