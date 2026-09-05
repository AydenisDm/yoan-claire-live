package com.eventview.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.eventview.app.ui.theme.EvAccent
import com.eventview.app.ui.theme.EvAccentFg
import com.eventview.app.ui.theme.EvFg
import com.eventview.app.ui.theme.EvRaised
import com.eventview.app.ui.theme.LocalEvColors
import com.eventview.core.ChatLine
import com.eventview.core.Crowd

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun GuestChatPanel(
    lines: List<ChatLine>,
    lastSentId: String?,
    coolingDown: Boolean,
    enabled: Boolean,
    onSend: (String) -> Unit,
    modifier: Modifier = Modifier,
    compact: Boolean = false,
) {
    val colors = LocalEvColors.current
    EvCard(modifier) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Send a note", style = MaterialTheme.typography.titleLarge, color = EvFg)
            Text(
                if (!enabled) {
                    "Notes unlock when the picture is live. Tap one then — guests and the streamer can see it."
                } else {
                    "Tap one. Guests and the streamer can see it. No typing."
                },
                style = MaterialTheme.typography.bodyMedium,
                color = colors.muted,
            )
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Crowd.chatOptions.forEach { option ->
                    val selected = lastSentId == option.id
                    FilterChip(
                        selected = selected,
                        onClick = { onSend(option.id) },
                        enabled = enabled && !coolingDown,
                        label = {
                            Text(
                                option.label,
                                modifier = Modifier.padding(vertical = 4.dp),
                            )
                        },
                        shape = RoundedCornerShape(999.dp),
                        modifier = Modifier.heightIn(min = 44.dp),
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = EvAccent,
                            selectedLabelColor = EvAccentFg,
                            containerColor = EvRaised,
                            labelColor = EvFg,
                            disabledContainerColor = EvRaised,
                            disabledLabelColor = colors.subtle,
                        ),
                    )
                }
            }
            if (coolingDown && enabled) {
                Text("Wait a moment before sending another.", style = MaterialTheme.typography.bodySmall, color = colors.subtle)
            }
            if (!compact) {
                lines.takeLast(6).asReversed().forEach { line ->
                    Text(line.label, style = MaterialTheme.typography.bodyMedium, color = colors.muted)
                }
            }
        }
    }
}
