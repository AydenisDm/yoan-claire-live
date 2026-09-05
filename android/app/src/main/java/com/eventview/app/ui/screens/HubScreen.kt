package com.eventview.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.eventview.app.ui.components.EvCard
import com.eventview.app.ui.components.ScreenHeader
import com.eventview.app.ui.theme.EvAccent
import com.eventview.app.ui.theme.EvAccentFg
import com.eventview.app.ui.theme.EvBg
import com.eventview.app.ui.theme.EvFg
import com.eventview.app.ui.theme.EvRaised
import com.eventview.app.util.EventViewWindow
import com.eventview.core.Crowd

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun HubScreen(
    picks: Map<String, String>,
    window: EventViewWindow,
    onChoose: (kind: String, choice: String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val pad = if (window.isTablet) 28.dp else 20.dp
    Column(
        modifier
            .fillMaxSize()
            .background(EvBg)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = pad)
            .padding(top = 20.dp, bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        ScreenHeader(
            title = "Hub",
            subtitle = "Tap how the stream looks and sounds. No account needed. Clear picture and sound tell the host the room is good.",
        )
        Crowd.feedbackGroups.forEach { group ->
            EvCard {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(group.title, style = MaterialTheme.typography.titleLarge, color = EvFg)
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        group.options.forEach { option ->
                            val selected = picks[group.kind] == option.id
                            FilterChip(
                                selected = selected,
                                onClick = { onChoose(group.kind, option.id) },
                                label = { Text(option.label) },
                                shape = RoundedCornerShape(999.dp),
                                modifier = Modifier.heightIn(min = 44.dp),
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = EvAccent,
                                    selectedLabelColor = EvAccentFg,
                                    containerColor = EvRaised,
                                    labelColor = EvFg,
                                ),
                            )
                        }
                    }
                }
            }
        }
    }
}
