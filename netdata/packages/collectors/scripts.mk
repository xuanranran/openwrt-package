# SPDX-License-Identifier: GPL-2.0-only
$(eval $(call NetdataPlugin,python,plugin-pythond,ENABLE_PLUGIN_PYTHON,Collectors: Python,+python3 +python3-yaml +python3-urllib3))
$(eval $(call NetdataPlugin,charts,plugin-chartsd,ENABLE_PLUGIN_CHARTS,Collectors: Bash charts,+bash))
