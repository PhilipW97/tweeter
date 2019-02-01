CREATE DATABASE tweeter;
USE tweeter;

CREATE TABLE users (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100),
  `username` varchar(100),
  `password` varchar(100),
    primary key (id)
);

CREATE TABLE tweets (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int(10),
  `content` varchar(100),
  `time` timestamp,
  primary key (id)
);

CREATE TABLE followers (
  `key` int NOT NULL AUTO_INCREMENT,
  `follower` int,
  `following` int,
  primary key (`key`)
);