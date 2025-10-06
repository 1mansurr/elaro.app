if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/Users/new/.gradle/caches/8.13/transforms/f78b1183f801430874adba74be3efb7b/transformed/hermes-android-0.79.5-release/prefab/modules/libhermes/libs/android.arm64-v8a/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/new/.gradle/caches/8.13/transforms/f78b1183f801430874adba74be3efb7b/transformed/hermes-android-0.79.5-release/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

