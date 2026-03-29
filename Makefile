.PHONY: build install start dev seed

install:
	cd client && npm install
	cd server && npm install

build:
	cd client && npm run build
	cd server && npm run build

dev:
	make -j 2 dev-client dev-server

dev-client:
	cd client && npm run dev

dev-server:
	cd server && npm run dev

seed:
	cd server && npm run seed

start:
	docker-compose up --build
