cmake_minimum_required(VERSION 3.16)
project(africhess_fairplay VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CHESS_HPP "${CMAKE_CURRENT_BINARY_DIR}/chess.hpp")
if(NOT EXISTS "${CHESS_HPP}")
  message(STATUS "Downloading chess.hpp (Disservin/chess-library)")
  file(DOWNLOAD
    "https://raw.githubusercontent.com/Disservin/chess-library/master/include/chess.hpp"
    "${CHESS_HPP}"
    SHOW_PROGRESS
    TLS_VERIFY ON
  )
endif()

set(AFRICHESS_NATIVE_SOURCES
  src/json_io.cpp
  src/stockfish_client.cpp
  src/detectors.cpp
  src/analyzer.cpp
  src/fairplay_api.cpp
  src/board_kernel.cpp
)

add_library(africhess_native SHARED ${AFRICHESS_NATIVE_SOURCES})
target_include_directories(africhess_native PRIVATE include ${CMAKE_CURRENT_BINARY_DIR})
set_target_properties(africhess_native PROPERTIES
  OUTPUT_NAME "africhess_native"
  VERSION 1.0.0
  SOVERSION 1
)

add_executable(africhess-fairplay src/main.cpp)
target_include_directories(africhess-fairplay PRIVATE include)
target_link_libraries(africhess-fairplay PRIVATE africhess_native)

install(TARGETS africhess_native africhess-fairplay
  LIBRARY DESTINATION lib
  RUNTIME DESTINATION bin
)
