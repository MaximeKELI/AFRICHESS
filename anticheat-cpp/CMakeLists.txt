cmake_minimum_required(VERSION 3.16)
project(africhess_fairplay VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(africhess-fairplay
  src/main.cpp
  src/json_io.cpp
  src/stockfish_client.cpp
  src/detectors.cpp
  src/analyzer.cpp
)

target_include_directories(africhess-fairplay PRIVATE include)

install(TARGETS africhess-fairplay RUNTIME DESTINATION bin)
